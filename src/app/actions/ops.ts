"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma, type PromotionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { receivePurchase } from "@/services/inventory.service";
import { getShopSettings } from "@/lib/settings";
import { formatRef, nextSequence } from "@/lib/sequences";
import { slugify } from "@/lib/pricing";
import { parseCfaInput } from "@/lib/money";
import { buildAutoSku } from "@/lib/sku";

function bounce(path: string, kind: "ok" | "erreur", message: string): never {
  const q = new URLSearchParams();
  q.set(kind, message);
  redirect(`${path}?${q.toString()}`);
}

async function uniqueVariantSku(name: string) {
  const now = Date.now();
  for (let i = 0; i < 8; i++) {
    const sku = buildAutoSku(name, now, i);
    const taken = await prisma.productVariant.findUnique({ where: { sku } });
    if (!taken) return sku;
  }
  return `${buildAutoSku(name)}-${Date.now().toString().slice(-4)}`;
}

export async function markNotificationRead(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/admin");
  revalidatePath("/admin/alertes");
}

export async function markAllNotificationsRead() {
  await requireStaff();
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  revalidatePath("/admin");
  revalidatePath("/admin/alertes");
}

export async function createStaffUser(formData: FormData) {
  try {
    const session = await requireStaff("users.create");
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const password = String(formData.get("password") ?? "");
    const roleId = String(formData.get("roleId") ?? "");
    if (!firstName || !lastName || !email) bounce("/admin/utilisateurs", "erreur", "Nom, prénom et email sont requis.");
    if (password.length < 8) bounce("/admin/utilisateurs", "erreur", "Mot de passe : 8 caractères minimum.");
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) bounce("/admin/utilisateurs", "erreur", "Rôle introuvable.");
    if (role.isSuperAdmin && !session.isSuperAdmin) {
      bounce("/admin/utilisateurs", "erreur", "Seul un super admin peut créer un super admin.");
    }
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        passwordHash: await hashPassword(password),
        roleId: role.id,
      },
    });
    await writeAudit({
      userId: session.userId,
      action: "USER_CREATE",
      entity: "User",
      entityId: user.id,
      after: { email, role: role.slug },
    });
    revalidatePath("/admin/utilisateurs");
    bounce("/admin/utilisateurs", "ok", `${firstName} ${lastName} a été créé.`);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      bounce("/admin/utilisateurs", "erreur", "Cet email est déjà utilisé.");
    }
    bounce("/admin/utilisateurs", "erreur", err instanceof Error ? err.message : "Création impossible.");
  }
}

export async function updateStaffUser(formData: FormData) {
  try {
    const session = await requireStaff("users.update");
    const userId = String(formData.get("userId") ?? "");
    const roleId = String(formData.get("roleId") ?? "");
    const active = String(formData.get("isActive") ?? "1") === "1";
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) bounce("/admin/utilisateurs", "erreur", "Utilisateur introuvable.");
    if (userId === session.userId && !active) {
      bounce("/admin/utilisateurs", "erreur", "Vous ne pouvez pas désactiver votre propre compte.");
    }
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) bounce("/admin/utilisateurs", "erreur", "Rôle introuvable.");
    if ((user.role.isSuperAdmin || role.isSuperAdmin) && !session.isSuperAdmin) {
      bounce("/admin/utilisateurs", "erreur", "Seul un super admin peut modifier ce compte.");
    }
    await prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id, isActive: active, status: active ? "ACTIVE" : "INACTIVE" },
    });
    await writeAudit({
      userId: session.userId,
      action: "USER_UPDATE",
      entity: "User",
      entityId: userId,
      before: { role: user.role.slug, isActive: user.isActive },
      after: { role: role.slug, isActive: active },
    });
    revalidatePath("/admin/utilisateurs");
    bounce("/admin/utilisateurs", "ok", "Utilisateur mis à jour.");
  } catch (err) {
    unstable_rethrow(err);
    bounce("/admin/utilisateurs", "erreur", err instanceof Error ? err.message : "Mise à jour impossible.");
  }
}

export async function toggleProductPublish(formData: FormData) {
  const session = await requireStaff("products.update");
  const productId = String(formData.get("productId") ?? "");
  const publish = String(formData.get("publish") ?? "") === "1";
  const current = await prisma.product.findUnique({ where: { id: productId } });
  if (!current || current.deletedAt) return;
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      onlineVisible: publish,
      status: current.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    },
  });
  await writeAudit({
    userId: session.userId,
    action: publish ? "PRODUCT_PUBLISH" : "PRODUCT_UNPUBLISH",
    entity: "Product",
    entityId: productId,
    after: { onlineVisible: publish },
  });
  revalidatePath("/admin/produits");
  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath("/boutique");
  revalidatePath("/pos");
  revalidatePath(`/produit/${product.slug}`);
}

export async function saveProductVariant(formData: FormData) {
  try {
    const session = await requireStaff("products.update");
    const productId = String(formData.get("productId") ?? "");
    const variantId = String(formData.get("variantId") ?? "");
    const name = String(formData.get("name") ?? "").trim() || "Standard";
    const salePrice = parseCfaInput(String(formData.get("salePrice") ?? ""));
    const costPrice = parseCfaInput(String(formData.get("costPrice") ?? ""));
    const barcode = String(formData.get("barcode") ?? "").trim() || null;
    const promoRaw = String(formData.get("promoPrice") ?? "").trim();
    const promoPrice = promoRaw ? parseCfaInput(promoRaw) : 0;
    if (salePrice <= 0) throw new Error("Prix de vente invalide.");
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Produit introuvable.");
    const promo = promoPrice > 0 && promoPrice < salePrice ? promoPrice : null;
    if (variantId) {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { name, salePrice, costPrice: costPrice || undefined, barcode, promoPrice: promo },
      });
    } else {
      const sku = await uniqueVariantSku(`${product.name} ${name}`);
      const created = await prisma.productVariant.create({
        data: {
          productId,
          name,
          sku,
          salePrice,
          costPrice,
          barcode,
          promoPrice: promo,
          isDefault: false,
        },
      });
      const location = await prisma.location.findFirst({ where: { isDefault: true } });
      const stock = parseCfaInput(String(formData.get("stock") ?? ""));
      if (location && stock > 0) {
        await receivePurchase({
          variantId: created.id,
          locationId: location.id,
          quantity: stock,
          userId: session.userId,
          comment: "Stock initial variante",
        });
      }
    }
    await writeAudit({
      userId: session.userId,
      action: variantId ? "VARIANT_UPDATE" : "VARIANT_CREATE",
      entity: "ProductVariant",
      entityId: variantId || productId,
      after: { name, salePrice, barcode },
    });
    revalidatePath(`/admin/produits/${productId}`);
    revalidatePath("/admin/produits");
    revalidatePath("/pos");
    bounce(`/admin/produits/${productId}`, "ok", "Variante enregistrée.");
  } catch (err) {
    unstable_rethrow(err);
    const productId = String(formData.get("productId") ?? "");
    bounce(`/admin/produits/${productId}`, "erreur", err instanceof Error ? err.message : "Variante impossible.");
  }
}

export async function saveStockPurchase(formData: FormData) {
  try {
    const session = await requireStaff("stock.purchase");
    const variantId = String(formData.get("variantId") ?? "");
    const quantity = Number(formData.get("quantity") ?? 0);
    const supplierId = String(formData.get("supplierId") ?? "").trim() || undefined;
    const reference = String(formData.get("reference") ?? "").trim() || undefined;
    const comment = String(formData.get("comment") ?? "").trim() || "Réception fournisseur";
    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) {
      bounce("/admin/stocks", "erreur", "Choisissez un produit et une quantité positive.");
    }
    const location = await prisma.location.findFirst({ where: { isDefault: true } });
    if (!location) bounce("/admin/stocks", "erreur", "Aucun magasin par défaut.");
    await receivePurchase({
      variantId,
      locationId: location.id,
      quantity,
      userId: session.userId,
      supplierId,
      reference,
      comment,
    });
    await writeAudit({
      userId: session.userId,
      action: "STOCK_PURCHASE",
      entity: "Inventory",
      entityId: variantId,
      after: { quantity, supplierId, reference },
    });
    revalidatePath("/admin/stocks");
    bounce("/admin/stocks", "ok", `Réception de ${quantity} unité(s) enregistrée.`);
  } catch (err) {
    unstable_rethrow(err);
    bounce("/admin/stocks", "erreur", err instanceof Error ? err.message : "Réception impossible.");
  }
}

export async function saveCoupon(formData: FormData) {
  try {
    await requireStaff("promotions.manage");
    const id = String(formData.get("id") ?? "");
    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const type = String(formData.get("type") ?? "PERCENT") === "FIXED" ? "FIXED" : "PERCENT";
    const value = parseCfaInput(String(formData.get("value") ?? ""));
    const minAmount = parseCfaInput(String(formData.get("minAmount") ?? ""));
    const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
    const isActive = id ? formData.get("isActive") === "on" : true;
    if (!code || value <= 0) bounce("/admin/promos", "erreur", "Code et valeur sont requis.");
    const data = {
      code,
      type: type as PromotionType,
      value,
      minAmount,
      maxUses: maxUses && Number.isFinite(maxUses) ? maxUses : null,
      isActive,
    };
    if (id) {
      await prisma.coupon.update({ where: { id }, data });
    } else {
      await prisma.coupon.create({ data });
    }
    revalidatePath("/admin/promos");
    bounce("/admin/promos", "ok", id ? "Code promo mis à jour." : `Code ${code} créé.`);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      bounce("/admin/promos", "erreur", "Ce code promo existe déjà.");
    }
    bounce("/admin/promos", "erreur", err instanceof Error ? err.message : "Enregistrement impossible.");
  }
}

export async function saveDeliveryZone(formData: FormData) {
  try {
    await requireStaff("promotions.manage");
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const fee = parseCfaInput(String(formData.get("fee") ?? ""));
    const isActive = formData.get("isActive") === "on";
    if (!name) bounce("/admin/promos", "erreur", "Nom de zone requis.");
    if (id) {
      await prisma.deliveryZone.update({ where: { id }, data: { name, fee, isActive } });
    } else {
      const last = await prisma.deliveryZone.aggregate({ _max: { sortOrder: true } });
      await prisma.deliveryZone.create({
        data: { name, fee, isActive: true, sortOrder: (last._max.sortOrder ?? 0) + 1 },
      });
    }
    revalidatePath("/admin/promos");
    revalidatePath("/checkout");
    bounce("/admin/promos", "ok", id ? "Zone mise à jour." : "Zone créée.");
  } catch (err) {
    unstable_rethrow(err);
    bounce("/admin/promos", "erreur", err instanceof Error ? err.message : "Zone impossible.");
  }
}

export async function saveBrand(formData: FormData) {
  try {
    await requireStaff("brands.manage");
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) bounce("/admin/marques", "erreur", "Nom de marque requis.");
    const slug = slugify(name);
    const isActive = !id || formData.get("isActive") === "on";
    if (id) {
      await prisma.brand.update({ where: { id }, data: { name, isActive } });
    } else {
      await prisma.brand.create({ data: { name, slug, isActive: true } });
    }
    revalidatePath("/admin/marques");
    revalidatePath("/admin/produits");
    bounce("/admin/marques", "ok", id ? "Marque mise à jour." : `${name} ajoutée.`);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      bounce("/admin/marques", "erreur", "Cette marque existe déjà.");
    }
    bounce("/admin/marques", "erreur", err instanceof Error ? err.message : "Marque impossible.");
  }
}

export async function saveSupplier(formData: FormData) {
  try {
    await requireStaff("suppliers.manage");
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) bounce("/admin/fournisseurs", "erreur", "Nom du fournisseur requis.");
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const email = String(formData.get("email") ?? "").trim() || null;
    const city = String(formData.get("city") ?? "").trim() || null;
    const address = String(formData.get("address") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const isActive = !id || formData.get("isActive") === "on";
    if (id) {
      await prisma.supplier.update({
        where: { id },
        data: { name, phone, email, city, address, notes, isActive },
      });
    } else {
      const settings = await getShopSettings();
      const created = await prisma.$transaction(async (tx) => {
        const seq = await nextSequence(tx, "supplier");
        return tx.supplier.create({
          data: {
            code: formatRef(settings.prefixes.supplier, seq.year, seq.value),
            name,
            phone,
            email,
            city,
            address,
            notes,
          },
        });
      });
      revalidatePath("/admin/fournisseurs");
      bounce("/admin/fournisseurs", "ok", `${created.name} enregistré (${created.code}).`);
    }
    revalidatePath("/admin/fournisseurs");
    revalidatePath("/admin/stocks");
    bounce("/admin/fournisseurs", "ok", "Fournisseur mis à jour.");
  } catch (err) {
    unstable_rethrow(err);
    bounce("/admin/fournisseurs", "erreur", err instanceof Error ? err.message : "Fournisseur impossible.");
  }
}

export async function updateOrderNotes(formData: FormData) {
  const session = await requireStaff("orders.update");
  const orderId = String(formData.get("orderId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!orderId) return;
  await prisma.order.update({ where: { id: orderId }, data: { notes } });
  await writeAudit({
    userId: session.userId,
    action: "ORDER_NOTES",
    entity: "Order",
    entityId: orderId,
    after: { notes },
  });
  revalidatePath(`/admin/commandes/${orderId}`);
}
