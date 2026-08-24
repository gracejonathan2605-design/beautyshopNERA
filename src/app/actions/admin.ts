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
import { uploadProductImage } from "@/lib/storage";

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

async function uniqueSku(requested: string, name: string) {
  const base =
    requested ||
    slugify(name).replace(/-/g, "").slice(0, 10).toUpperCase() ||
    "NER";
  for (let i = 0; i < 8; i++) {
    const sku = i === 0 && requested ? requested : `${base}-${Date.now().toString(36).toUpperCase().slice(-4)}${i || ""}`;
    const [onProduct, onVariant] = await Promise.all([
      prisma.product.findFirst({ where: { sku } }),
      prisma.productVariant.findUnique({ where: { sku } }),
    ]);
    if (!onProduct && !onVariant) return sku;
  }
  return `${base}-${Date.now()}`;
}

export async function saveProduct(
  _prev: ProductFormState | null,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    const session = await requireStaff("products.create");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "Indiquez le nom du produit." };

    const salePrice = parseMoney(formData.get("salePrice"));
    if (salePrice <= 0) return { ok: false, error: "Indiquez un prix de vente (FCFA)." };

    const costPrice = parseMoney(formData.get("costPrice"));
    const stock = Math.max(0, parseMoney(formData.get("stock")));
    const sku = await uniqueSku(String(formData.get("sku") ?? "").trim(), name);

    const locationId = (await prisma.location.findFirst({ where: { isDefault: true } }))?.id;
    if (!locationId) return { ok: false, error: "Aucun magasin par défaut. Relancez le seed ou créez un magasin." };

    const product = await prisma.product.create({
      data: {
        name,
        slug: `${slugify(name) || "produit"}-${Date.now().toString().slice(-6)}`,
        shortDescription: String(formData.get("shortDescription") ?? "") || null,
        description: String(formData.get("description") ?? "") || null,
        status: "ACTIVE",
        categoryId: String(formData.get("categoryId") ?? "") || null,
        brandId: String(formData.get("brandId") ?? "") || null,
        supplierId: String(formData.get("supplierId") ?? "") || null,
        isFeatured: formData.get("isFeatured") === "on",
        isNew: true,
        isPromo: formData.get("isPromo") === "on",
        onlineVisible: true,
        variants: {
          create: {
            name: "Standard",
            sku,
            barcode: String(formData.get("barcode") ?? "") || null,
            costPrice,
            salePrice,
            promoPrice: formData.get("promoPrice") ? parseMoney(formData.get("promoPrice")) : null,
            isDefault: true,
          },
        },
      },
      include: { variants: true },
    });

    let warning: string | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      try {
        const url = await uploadProductImage(image, product.id);
        await prisma.productImage.create({
          data: { productId: product.id, url, alt: name, sortOrder: 0 },
        });
      } catch (err) {
        warning = err instanceof Error ? `Produit créé, mais la photo n’a pas été envoyée : ${err.message}` : "Produit créé sans photo.";
      }
    }

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
      after: { name, sku },
    });
    revalidatePath("/admin/produits");
    revalidatePath("/boutique");
    revalidatePath("/");
    return { ok: true, name, warning };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Ce SKU existe déjà. Laissez le champ SKU vide, un code unique sera créé." };
    }
    const message = err instanceof Error ? err.message : "Création impossible.";
    return { ok: false, error: message };
  }
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
