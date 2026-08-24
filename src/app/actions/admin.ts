"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { adjustStock, receivePurchase } from "@/services/inventory.service";
import { updateOrderStatus } from "@/services/order.service";
import { slugify } from "@/lib/pricing";
import { DEFAULT_SETTINGS, saveShopSettings, type ShopSettings } from "@/lib/settings";

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

export async function saveProduct(formData: FormData) {
  const session = await requireStaff("products.create");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const salePrice = Number(formData.get("salePrice") ?? 0);
  const costPrice = Number(formData.get("costPrice") ?? 0);
  const stock = Number(formData.get("stock") ?? 0);
  if (!name || !sku) throw new Error("Nom et SKU requis");
  const locationId = (await prisma.location.findFirst({ where: { isDefault: true } }))?.id;
  if (!locationId) throw new Error("Magasin manquant");
  const product = await prisma.product.create({
    data: {
      name,
      slug: `${slugify(name)}-${Date.now().toString().slice(-4)}`,
      shortDescription: String(formData.get("shortDescription") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      status: "ACTIVE",
      categoryId: String(formData.get("categoryId") ?? "") || null,
      brandId: String(formData.get("brandId") ?? "") || null,
      supplierId: String(formData.get("supplierId") ?? "") || null,
      isFeatured: formData.get("isFeatured") === "on",
      isNew: formData.get("isNew") === "on",
      isPromo: formData.get("isPromo") === "on",
      onlineVisible: formData.get("onlineVisible") !== "off",
      variants: {
        create: {
          name: "Standard",
          sku,
          barcode: String(formData.get("barcode") ?? "") || null,
          costPrice,
          salePrice,
          promoPrice: formData.get("promoPrice") ? Number(formData.get("promoPrice")) : null,
          isDefault: true,
        },
      },
    },
    include: { variants: true },
  });
  if (stock) {
    await receivePurchase({
      variantId: product.variants[0].id,
      locationId,
      quantity: stock,
      userId: session.userId,
      comment: "Stock initial",
    });
  }
  revalidatePath("/admin/produits");
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
