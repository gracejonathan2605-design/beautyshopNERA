"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { adjustStock, receivePurchase } from "@/services/inventory.service";
import { updateOrderStatus } from "@/services/order.service";
import { slugify } from "@/lib/pricing";
import { DEFAULT_SETTINGS, saveShopSettings, type ShopSettings } from "@/lib/settings";
import { uploadProductImage, uploadProductVideo } from "@/lib/storage";
import { buildAutoSku, skuBaseFromName } from "@/lib/sku";
import { MAX_PRODUCT_PHOTOS, MAX_VIDEO_SECONDS } from "@/lib/product-media";

export async function saveCategory(formData: FormData) {
  const session = await requireStaff("categories.create");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) throw new Error("Nom requis");
  await prisma.category.create({
    data: {
      name,
      slug: `${slugify(name)}-${Date.now().toString().slice(-4)}`,
      parentId,
      description: String(formData.get("description") ?? "") || null,
    },
  });
  await writeAudit({ userId: session.userId, action: "CATEGORY_CREATE", entity: "Category", after: { name } });
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function installNeraCatalog() {
  const session = await requireStaff("categories.create");
  const { syncNeraCatalog } = await import("@/lib/catalog");
  const ids = await syncNeraCatalog(prisma);
  await writeAudit({
    userId: session.userId,
    action: "CATALOG_SYNC",
    entity: "Category",
    after: { count: Object.keys(ids).length },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/produits");
  revalidatePath("/");
  revalidatePath("/boutique");
}

export type ProductFormState = {
  ok: boolean;
  error?: string;
  warning?: string;
  name?: string;
};

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : 0;
}

async function uniqueSku(name: string) {
  const now = Date.now();
  for (let i = 0; i < 8; i++) {
    const sku = buildAutoSku(name, now, i);
    const [onProduct, onVariant] = await Promise.all([
      prisma.product.findFirst({ where: { sku } }),
      prisma.productVariant.findUnique({ where: { sku } }),
    ]);
    if (!onProduct && !onVariant) return sku;
  }
  return `${skuBaseFromName(name)}-${Date.now()}`;
}

function refreshCatalog(slug?: string) {
  revalidatePath("/admin/produits");
  revalidatePath("/boutique");
  revalidatePath("/");
  revalidatePath("/pos");
  if (slug) revalidatePath(`/produit/${slug}`);
}

async function attachMedia(productId: string, name: string, formData: FormData, existingPhotoCount = 0) {
  const remaining = Math.max(0, MAX_PRODUCT_PHOTOS - existingPhotoCount);
  const photos = formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0)
    .slice(0, remaining);
  let order = existingPhotoCount;
  let warning: string | undefined;
  for (const [index, photo] of photos.entries()) {
    try {
      const url = await uploadProductImage(photo, productId, index);
      await prisma.productImage.create({
        data: { productId, url, alt: name, sortOrder: order, kind: "IMAGE" },
      });
      order += 1;
    } catch (err) {
      warning = err instanceof Error ? err.message : "Une photo n’a pas pu être envoyée.";
    }
  }
  const video = formData.get("video");
  if (video instanceof File && video.size > 0) {
    const duration = Number(formData.get("videoDuration") ?? 0);
    if (duration > MAX_VIDEO_SECONDS) {
      warning = "La vidéo dépasse 40 secondes et n’a pas été enregistrée.";
    } else {
      try {
        const url = await uploadProductVideo(video, productId);
        await prisma.productImage.create({
          data: {
            productId,
            url,
            alt: name,
            sortOrder: order,
            kind: "VIDEO",
            durationSeconds: duration > 0 ? Math.round(duration) : null,
          },
        });
      } catch (err) {
        warning = err instanceof Error ? `Produit enregistré, vidéo refusée : ${err.message}` : "Produit enregistré sans vidéo.";
      }
    }
  }
  return warning;
}

export async function saveProduct(
  _prev: ProductFormState | null,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    const session = await requireStaff("products.create");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "Indiquez le nom du produit." };

    const categoryId = String(formData.get("categoryId") ?? "").trim();
    if (!categoryId) {
      return { ok: false, error: "Choisissez une catégorie. Sans catégorie, le produit n’apparaît pas dans la boutique." };
    }

    const salePrice = parseMoney(formData.get("salePrice"));
    if (salePrice <= 0) return { ok: false, error: "Indiquez un prix de vente (FCFA)." };

    const costPrice = parseMoney(formData.get("costPrice"));
    const stock = Math.max(0, parseMoney(formData.get("stock")));
    const sku = await uniqueSku(name);

    const locationId = (await prisma.location.findFirst({ where: { isDefault: true } }))?.id;
    if (!locationId) return { ok: false, error: "Aucun magasin par défaut. Relancez le seed ou créez un magasin." };

    const product = await prisma.product.create({
      data: {
        name,
        slug: `${slugify(name) || "produit"}-${Date.now().toString().slice(-6)}`,
        shortDescription: String(formData.get("shortDescription") ?? "") || null,
        description: String(formData.get("description") ?? "") || null,
        sku,
        status: "ACTIVE",
        categoryId,
        isFeatured: formData.get("isFeatured") === "on",
        isNew: true,
        isPromo: formData.get("isPromo") === "on",
        onlineVisible: true,
        variants: {
          create: {
            name: "Standard",
            sku,
            costPrice,
            salePrice,
            isDefault: true,
          },
        },
      },
      include: { variants: true, category: true },
    });

    const warning = await attachMedia(product.id, name, formData);

    if (stock) {
      await receivePurchase({
        variantId: product.variants[0].id,
        locationId,
        quantity: stock,
        userId: session.userId,
        comment: "Stock initial",
      });
    }

    await writeAudit({
      userId: session.userId,
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      after: { name, sku, categoryId },
    });
    refreshCatalog(product.slug);
    return {
      ok: true,
      name,
      warning: warning
        ? `${name} est en boutique et à la caisse (SKU ${sku}). ${warning}`
        : `${name} est en boutique et à la caisse. SKU : ${sku}`,
    };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Un produit avec ce nom existe déjà. Changez le nom." };
    }
    const message = err instanceof Error ? err.message : "Création impossible.";
    return { ok: false, error: message };
  }
}

export async function updateProductPrice(formData: FormData) {
  await requireStaff("products.update");
  const variantId = String(formData.get("variantId") ?? "");
  const salePrice = parseMoney(formData.get("salePrice"));
  if (!variantId || salePrice <= 0) throw new Error("Prix invalide");
  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: { salePrice },
    include: { product: true },
  });
  await writeAudit({
    action: "PRODUCT_PRICE_UPDATE",
    entity: "ProductVariant",
    entityId: variantId,
    after: { salePrice },
  });
  refreshCatalog(variant.product.slug);
}

export async function deleteProduct(formData: FormData) {
  await requireStaff("products.delete");
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), status: "ARCHIVED", onlineVisible: false },
  });
  await prisma.productVariant.updateMany({
    where: { productId },
    data: { deletedAt: new Date(), isActive: false },
  });
  await writeAudit({ action: "PRODUCT_DELETE", entity: "Product", entityId: productId, after: { name: product.name } });
  refreshCatalog(product.slug);
}

export async function updateProduct(
  _prev: ProductFormState | null,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    const session = await requireStaff("products.update");
    const productId = String(formData.get("productId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const categoryId = String(formData.get("categoryId") ?? "").trim();
    const salePrice = parseMoney(formData.get("salePrice"));
    if (!productId || !name) return { ok: false, error: "Nom requis" };
    if (!categoryId) return { ok: false, error: "Catégorie obligatoire" };
    if (salePrice <= 0) return { ok: false, error: "Prix invalide" };

    const current = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } }, images: true },
    });
    if (!current || current.deletedAt) return { ok: false, error: "Produit introuvable" };

    const photoCount = current.images.filter((m) => m.kind === "IMAGE").length;
    const hasVideo = current.images.some((m) => m.kind === "VIDEO");
    const incomingPhotos = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
    if (photoCount + incomingPhotos.length > MAX_PRODUCT_PHOTOS) {
      return { ok: false, error: `Maximum ${MAX_PRODUCT_PHOTOS} photos par produit.` };
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        categoryId,
        shortDescription: String(formData.get("shortDescription") ?? "") || null,
        isFeatured: formData.get("isFeatured") === "on",
        onlineVisible: true,
        status: "ACTIVE",
      },
    });
    const variant = current.variants[0];
    if (variant) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { salePrice, costPrice: parseMoney(formData.get("costPrice")) || variant.costPrice },
      });
    }

    if (hasVideo && formData.get("video") instanceof File && (formData.get("video") as File).size > 0) {
      return { ok: false, error: "Ce produit a déjà une vidéo. Supprimez-la avant d’en ajouter une autre." };
    }

    const warning = await attachMedia(productId, name, formData, photoCount);
    await writeAudit({
      userId: session.userId,
      action: "PRODUCT_UPDATE",
      entity: "Product",
      entityId: productId,
      after: { name, salePrice },
    });
    refreshCatalog(current.slug);
    return {
      ok: true,
      name,
      warning: warning
        ? `Produit mis à jour. ${warning}`
        : "Produit mis à jour. Visible en boutique et à la caisse.",
    };
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, error: err instanceof Error ? err.message : "Mise à jour impossible." };
  }
}

export async function deleteProductMedia(formData: FormData) {
  await requireStaff("products.update");
  const mediaId = String(formData.get("mediaId") ?? "");
  const media = await prisma.productImage.delete({ where: { id: mediaId }, include: { product: true } });
  refreshCatalog(media.product.slug);
}

export async function saveStockAdjust(formData: FormData) {
  const session = await requireStaff("stock.adjust");
  const variantId = String(formData.get("variantId"));
  const quantity = Number(formData.get("quantity"));
  const location = await prisma.location.findFirst({ where: { isDefault: true } });
  if (!location) throw new Error("Magasin manquant");
  await adjustStock({
    variantId,
    locationId: location.id,
    quantity,
    userId: session.userId,
    type: quantity < 0 ? "LOSS" : "ADJUSTMENT",
    comment: String(formData.get("comment") ?? "") || "Ajustement manuel",
  });
  revalidatePath("/admin/stocks");
}

export async function changeOrderStatus(orderId: string, status: OrderStatus) {
  const session = await requireStaff("orders.update");
  await updateOrderStatus({ orderId, status, userId: session.userId });
  revalidatePath("/admin/commandes");
}

export async function saveExpense(formData: FormData) {
  const session = await requireStaff("expenses.manage");
  await prisma.expense.create({
    data: {
      categoryId: String(formData.get("categoryId")),
      amount: Number(formData.get("amount")),
      date: new Date(String(formData.get("date") ?? new Date().toISOString())),
      description: String(formData.get("description") ?? "") || null,
      userId: session.userId,
    },
  });
  revalidatePath("/admin/depenses");
}

export async function saveSettings(formData: FormData) {
  await requireStaff("settings.update");
  const next: ShopSettings = {
    ...DEFAULT_SETTINGS,
    name: String(formData.get("name") ?? DEFAULT_SETTINGS.name),
    slogan: String(formData.get("slogan") ?? DEFAULT_SETTINGS.slogan),
    phone: String(formData.get("phone") ?? DEFAULT_SETTINGS.phone),
    email: String(formData.get("email") ?? DEFAULT_SETTINGS.email),
    address: String(formData.get("address") ?? DEFAULT_SETTINGS.address),
    city: String(formData.get("city") ?? DEFAULT_SETTINGS.city),
    country: String(formData.get("country") ?? DEFAULT_SETTINGS.country),
    ticketFooter: String(formData.get("ticketFooter") ?? DEFAULT_SETTINGS.ticketFooter),
  };
  await saveShopSettings(next);
  revalidatePath("/admin/parametres");
}
