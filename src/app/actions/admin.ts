"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { adjustStock, receivePurchase } from "@/services/inventory.service";
import { updateOrderStatus } from "@/services/order.service";
import { slugify } from "@/lib/pricing";
import { getShopSettings, saveShopSettings, type ShopSettings } from "@/lib/settings";
import { uploadProductImage, uploadProductVideo } from "@/lib/storage";
import { buildAutoSku, skuBaseFromName } from "@/lib/sku";
import { MAX_PRODUCT_PHOTOS, MAX_VIDEO_SECONDS } from "@/lib/product-media";
import { categoryDeleteBlocker } from "@/lib/categories";
import { createCustomerRecord } from "@/services/customer.service";
import { hasPermission } from "@/lib/permissions";
import { parseCfaInput } from "@/lib/money";
import { assignFlashOnPublish, isPublishedOnline, normalizeFlashDurationDays } from "@/lib/flash";
import {
  defaultStockMoveComment,
  isStockMoveReason,
  quantityForStockReason,
} from "@/lib/stock-move";

function refreshCategories() {
  updateTag("catalog");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/produits");
  revalidatePath("/");
  revalidatePath("/boutique");
}

function bounceCategories(kind: "ok" | "erreur", message: string): never {
  const q = new URLSearchParams();
  q.set(kind, message);
  redirect(`/admin/categories?${q.toString()}`);
}

export async function saveCategory(formData: FormData) {
  try {
    const session = await requireStaff("categories.create");
    const name = String(formData.get("name") ?? "").trim();
    const parentId = String(formData.get("parentId") ?? "") || null;
    if (!name) bounceCategories("erreur", "Indiquez le nom du rayon.");
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent || parent.deletedAt) bounceCategories("erreur", "Rayon parent introuvable.");
      if (parent.parentId) bounceCategories("erreur", "Un sous-rayon ne peut pas contenir d’autre sous-rayon.");
    }
    const siblings = await prisma.category.count({
      where: { parentId, deletedAt: null },
    });
    await prisma.category.create({
      data: {
        name,
        slug: `${slugify(name) || "rayon"}-${Date.now().toString().slice(-4)}`,
        parentId,
        description: String(formData.get("description") ?? "") || null,
        sortOrder: siblings,
      },
    });
    await writeAudit({ userId: session.userId, action: "CATEGORY_CREATE", entity: "Category", after: { name, parentId } });
    refreshCategories();
    bounceCategories("ok", parentId ? `Sous-rayon « ${name} » ajouté.` : `Rayon « ${name} » ajouté.`);
  } catch (err) {
    unstable_rethrow(err);
    bounceCategories("erreur", err instanceof Error ? err.message : "Ajout impossible.");
  }
}

export async function updateCategory(formData: FormData) {
  try {
    const session = await requireStaff("categories.update");
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    if (!id || !name) bounceCategories("erreur", "Nom requis.");
    const current = await prisma.category.findUnique({ where: { id } });
    if (!current || current.deletedAt) bounceCategories("erreur", "Rayon introuvable.");
    await prisma.category.update({ where: { id }, data: { name } });
    await writeAudit({
      userId: session.userId,
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: id,
      before: { name: current.name },
      after: { name },
    });
    refreshCategories();
    bounceCategories("ok", `« ${name} » enregistré.`);
  } catch (err) {
    unstable_rethrow(err);
    bounceCategories("erreur", err instanceof Error ? err.message : "Modification impossible.");
  }
}

export async function deleteCategory(formData: FormData) {
  try {
    const session = await requireStaff("categories.delete");
    const id = String(formData.get("id") ?? "");
    const confirmName = String(formData.get("confirmName") ?? "").trim();
    if (!id) bounceCategories("erreur", "Rayon manquant.");
    const current = await prisma.category.findUnique({
      where: { id },
      include: {
        children: { where: { deletedAt: null }, select: { id: true } },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });
    if (!current || current.deletedAt) bounceCategories("erreur", "Rayon introuvable.");
    const blocked = categoryDeleteBlocker({
      childCount: current.children.length,
      productCount: current._count.products,
    });
    if (blocked) bounceCategories("erreur", blocked);
    if (confirmName !== current.name) {
      bounceCategories("erreur", `Pour supprimer, tapez exactement : ${current.name}`);
    }
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await writeAudit({
      userId: session.userId,
      action: "CATEGORY_DELETE",
      entity: "Category",
      entityId: id,
      after: { name: current.name, soft: true },
    });
    refreshCategories();
    bounceCategories("ok", `« ${current.name} » a été masqué.`);
  } catch (err) {
    unstable_rethrow(err);
    bounceCategories("erreur", err instanceof Error ? err.message : "Suppression impossible.");
  }
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

function parsePromoPrice(value: FormDataEntryValue | null, salePrice: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = parseMoney(value);
  if (n <= 0 || n >= salePrice) return null;
  return n;
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
  updateTag("catalog");
  revalidatePath("/admin/produits");
  revalidatePath("/boutique");
  revalidatePath("/");
  revalidatePath("/flash");
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
  const uploaded = await Promise.all(
    photos.map(async (photo, index) => {
      try {
        const url = await uploadProductImage(photo, productId, index);
        return { url, sortOrder: existingPhotoCount + index };
      } catch (err) {
        warning = err instanceof Error ? err.message : "Une photo n’a pas pu être envoyée.";
        return null;
      }
    }),
  );
  for (const item of uploaded) {
    if (!item) continue;
    await prisma.productImage.create({
      data: { productId, url: item.url, alt: name, sortOrder: item.sortOrder, kind: "IMAGE" },
    });
    order = item.sortOrder + 1;
  }
  const video = formData.get("video");
  if (video instanceof File && video.size > 0) {
    const duration = Number(formData.get("videoDuration") ?? 0);
    if (!Number.isFinite(duration) || duration <= 0) {
      warning = "Durée de la vidéo inconnue. Attendez le chargement puis réessayez.";
    } else if (duration > MAX_VIDEO_SECONDS) {
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

    const salePrice = parseMoney(formData.get("variantSalePrice") ?? formData.get("salePrice"));
    if (salePrice <= 0) return { ok: false, error: "Indiquez un prix de vente (FCFA)." };

    const names = formData.getAll("variantName").map((v) => String(v).trim());
    const salePrices = formData.getAll("variantSalePrice");
    const promoPrices = formData.getAll("variantPromoPrice");
    const costPrices = formData.getAll("variantCostPrice");
    const barcodes = formData.getAll("variantBarcode");
    const stocks = formData.getAll("variantStock");
    const variantInputs =
      names.length > 0
        ? names.map((variantName, index) => {
            const price = parseMoney(salePrices[index] ?? null);
            return {
              name: variantName || (index === 0 ? "Standard" : `Variante ${index + 1}`),
              salePrice: price,
              promoPrice: parsePromoPrice(promoPrices[index] ?? null, price),
              costPrice: parseMoney(costPrices[index] ?? null),
              barcode: String(barcodes[index] ?? "").trim() || null,
              stock: Math.max(0, parseMoney(stocks[index] ?? null)),
            };
          }).filter((row) => row.salePrice > 0)
        : [
            {
              name: "Standard",
              salePrice,
              promoPrice: parsePromoPrice(formData.get("promoPrice"), salePrice),
              costPrice: parseMoney(formData.get("costPrice")),
              barcode: String(formData.get("barcode") ?? "").trim() || null,
              stock: Math.max(0, parseMoney(formData.get("stock"))),
            },
          ];
    if (!variantInputs.length) return { ok: false, error: "Indiquez au moins une variante avec un prix." };

    const promoPrice = variantInputs[0].promoPrice;
    const isPromo = formData.get("isPromo") === "on" || variantInputs.some((v) => v.promoPrice != null);
    const isNew = formData.get("isNew") === "on";
    const onlineVisible = formData.get("onlineVisible") === "on";
    const brandId = String(formData.get("brandId") ?? "").trim() || null;
    const supplierId = String(formData.get("supplierId") ?? "").trim() || null;
    const status = "ACTIVE";
    const sku = await uniqueSku(name);

    const locationId = (await prisma.location.findFirst({ where: { isDefault: true } }))?.id;
    if (!locationId) return { ok: false, error: "Aucun magasin par défaut. Relancez le seed ou créez un magasin." };

    const settings = await getShopSettings();
    const flash = assignFlashOnPublish({
      alreadyStarted: null,
      alreadyEnded: null,
      wasPublished: false,
      willBePublished: isPublishedOnline({ status, onlineVisible, deletedAt: null }),
      durationDays: settings.flashDurationDays,
    });

    const product = await prisma.product.create({
      data: {
        name,
        slug: `${slugify(name) || "produit"}-${Date.now().toString().slice(-6)}`,
        shortDescription: String(formData.get("shortDescription") ?? "") || null,
        description: String(formData.get("description") ?? "") || null,
        sku,
        status,
        categoryId,
        brandId,
        supplierId,
        isFeatured: formData.get("isFeatured") === "on",
        isNew,
        isPromo,
        onlineVisible,
        flashStartAt: flash.flashStartAt,
        flashEndAt: flash.flashEndAt,
        variants: {
          create: await (async () => {
            const rows = [];
            for (let index = 0; index < variantInputs.length; index++) {
              const row = variantInputs[index];
              rows.push({
                name: row.name,
                sku: index === 0 ? sku : await uniqueSku(`${name} ${row.name}`),
                costPrice: row.costPrice,
                salePrice: row.salePrice,
                promoPrice: row.promoPrice,
                barcode: row.barcode,
                isDefault: index === 0,
              });
            }
            return rows;
          })(),
        },
      },
      include: { variants: true, category: true },
    });

    const warning = await attachMedia(product.id, name, formData);
    const createdVariants = [...product.variants].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const [index, row] of variantInputs.entries()) {
      if (!row.stock) continue;
      const variant = createdVariants[index];
      if (!variant) continue;
      await receivePurchase({
        variantId: variant.id,
        locationId,
        quantity: row.stock,
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
        ? `${name} est ${onlineVisible ? "en boutique et à la caisse" : "enregistré (pas encore en FLASH NERA ni en boutique)"} (SKU ${sku}). ${warning}`
        : `${name} est ${onlineVisible ? "en boutique et à la caisse" : "enregistré (pas encore en FLASH NERA ni en boutique)"}. SKU : ${sku}`,
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
    const promoPrice = parsePromoPrice(formData.get("promoPrice"), salePrice);
    const isPromo = formData.get("isPromo") === "on" || promoPrice != null;
    const barcode = String(formData.get("barcode") ?? "").trim() || null;
    const onlineVisible = formData.get("onlineVisible") === "on";
    const brandId = String(formData.get("brandId") ?? "").trim() || null;
    const supplierId = String(formData.get("supplierId") ?? "").trim() || null;
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
    const incomingVideo = formData.get("video");
    if (hasVideo && incomingVideo instanceof File && incomingVideo.size > 0) {
      return { ok: false, error: "Ce produit a déjà une vidéo. Supprimez-la avant d’en ajouter une autre." };
    }

    const nextStatus = current.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
    const settings = await getShopSettings();
    const flash = assignFlashOnPublish({
      alreadyStarted: current.flashStartAt,
      alreadyEnded: current.flashEndAt,
      wasPublished: isPublishedOnline(current),
      willBePublished: isPublishedOnline({ status: nextStatus, onlineVisible, deletedAt: null }),
      durationDays: settings.flashDurationDays,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        categoryId,
        shortDescription: String(formData.get("shortDescription") ?? "") || null,
        isFeatured: formData.get("isFeatured") === "on",
        isPromo,
        isNew: formData.get("isNew") === "on",
        onlineVisible,
        status: nextStatus,
        brandId,
        supplierId,
        flashStartAt: flash.flashStartAt,
        flashEndAt: flash.flashEndAt,
      },
    });
    const variant = current.variants[0];
    if (variant) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          salePrice,
          promoPrice,
          costPrice: parseMoney(formData.get("costPrice")) || variant.costPrice,
          barcode,
        },
      });
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
  const rawType = String(formData.get("type") ?? "ADJUSTMENT");
  const type = isStockMoveReason(rawType) ? rawType : "ADJUSTMENT";
  const quantity = quantityForStockReason(type, Number(formData.get("quantity")));
  const location = await prisma.location.findFirst({ where: { isDefault: true } });
  if (!location) throw new Error("Magasin manquant");
  await adjustStock({
    variantId,
    locationId: location.id,
    quantity,
    userId: session.userId,
    type,
    comment: String(formData.get("comment") ?? "").trim() || defaultStockMoveComment(type),
  });
  revalidatePath("/admin/stocks");
}

export async function changeOrderStatus(formData: FormData) {
  const session = await requireStaff("orders.update");
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!orderId || !status) throw new Error("Commande ou statut manquant");
  if ((status === "CANCELLED" || status === "REFUNDED") && !hasPermission(session, "orders.cancel")) {
    throw new Error("Vous n’avez pas le droit d’annuler une commande.");
  }
  await updateOrderStatus({ orderId, status, userId: session.userId });
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin/stocks");
  revalidatePath("/admin/alertes");
}

export async function collectOrderPayment(formData: FormData) {
  const session = await requireStaff("orders.update");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) throw new Error("Commande manquante");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new Error("Commande introuvable");
  const pending = order.payments.find((p) => p.status === "PENDING");
  if (!pending) throw new Error("Aucun paiement en attente sur cette commande");
  await prisma.payment.update({
    where: { id: pending.id },
    data: {
      status: "COMPLETED",
      note: `Encaissé par ${session.firstName} ${session.lastName}`.trim(),
    },
  });
  if (order.status === "PENDING") {
    await updateOrderStatus({ orderId, status: "CONFIRMED", userId: session.userId });
  }
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin/alertes");
}

function bounceClients(kind: "ok" | "erreur", message: string): never {
  const q = new URLSearchParams();
  q.set(kind, message);
  redirect(`/admin/clients?${q.toString()}`);
}

export async function saveCustomer(formData: FormData) {
  try {
    const session = await requireStaff("customers.create");
    const customer = await createCustomerRecord({
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
    });
    await writeAudit({
      userId: session.userId,
      action: "CUSTOMER_CREATE",
      entity: "Customer",
      entityId: customer.id,
      after: { code: customer.code, name: `${customer.firstName} ${customer.lastName}` },
    });
    revalidatePath("/admin/clients");
    bounceClients("ok", `${customer.firstName} ${customer.lastName} enregistrée (${customer.code}).`);
  } catch (err) {
    unstable_rethrow(err);
    bounceClients("erreur", err instanceof Error ? err.message : "Création impossible.");
  }
}

export async function saveExpense(formData: FormData) {
  const session = await requireStaff("expenses.manage");
  const amount = parseCfaInput(String(formData.get("amount") ?? ""));
  if (amount <= 0) throw new Error("Indiquez un montant de dépense valide.");
  const dateRaw = String(formData.get("date") ?? "");
  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Date invalide.");
  await prisma.expense.create({
    data: {
      categoryId: String(formData.get("categoryId")),
      amount,
      date,
      description: String(formData.get("description") ?? "") || null,
      userId: session.userId,
    },
  });
  revalidatePath("/admin/depenses");
}

export async function saveSettings(formData: FormData) {
  await requireStaff("settings.update");
  const current = await getShopSettings();
  const next: ShopSettings = {
    ...current,
    name: String(formData.get("name") ?? current.name),
    slogan: String(formData.get("slogan") ?? current.slogan),
    phone: String(formData.get("phone") ?? current.phone),
    email: String(formData.get("email") ?? current.email),
    mtnPhone: String(formData.get("mtnPhone") ?? current.mtnPhone),
    rccm: String(formData.get("rccm") ?? current.rccm),
    nui: String(formData.get("nui") ?? current.nui),
    address: String(formData.get("address") ?? current.address),
    city: String(formData.get("city") ?? current.city),
    country: String(formData.get("country") ?? current.country),
    ticketFooter: String(formData.get("ticketFooter") ?? current.ticketFooter),
    flashDurationDays: normalizeFlashDurationDays(formData.get("flashDurationDays") ?? current.flashDurationDays),
  };
  await saveShopSettings(next);
  updateTag("catalog");
  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/boutique");
  revalidatePath("/pos");
}
