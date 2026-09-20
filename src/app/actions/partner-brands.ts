"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { uploadBrandImage } from "@/lib/storage";
import { slugify } from "@/lib/pricing";
import {
  isCollectionKind,
  isPartnershipType,
  uniqueBrandSlug,
} from "@/lib/partner-brands";

function bounce(path: string, kind: "ok" | "erreur", message: string): never {
  const q = new URLSearchParams();
  q.set(kind, message);
  redirect(`${path}?${q.toString()}`);
}

function refreshBrandPages(slug?: string) {
  updateTag("catalog");
  revalidatePath("/admin/marques");
  revalidatePath("/marques");
  revalidatePath("/");
  revalidatePath("/boutique");
  if (slug) {
    revalidatePath(`/marques/${slug}`);
    revalidatePath(`/admin/marques/${slug}`);
  }
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = uniqueBrandSlug(base);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const taken = await prisma.brand.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${slug}-${Date.now().toString().slice(-4)}`;
}

export async function savePartnerBrand(formData: FormData) {
  try {
    const session = await requireStaff("brands.manage");
    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) bounce("/admin/marques", "erreur", "Nom de marque requis.");
    const requestedSlug = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const isPartner = formData.get("isPartner") === "on";
    const showOnSite = formData.get("showOnSite") === "on";
    const isActive = formData.get("isActive") === "on" || !id;
    const sortOrder = Math.max(0, Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0);
    const partnershipRaw = String(formData.get("partnershipType") ?? "UNSET");
    const partnershipType = isPartnershipType(partnershipRaw) ? partnershipRaw : "UNSET";
    const logoFile = formData.get("logo");
    const bannerFile = formData.get("banner");

    let brandId = id;
    let slug = "";
    if (id) {
      const current = await prisma.brand.findUnique({ where: { id } });
      if (!current || current.deletedAt) bounce("/admin/marques", "erreur", "Marque introuvable.");
      slug = await uniqueSlug(requestedSlug || current.slug || name, id);
      await prisma.brand.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          isPartner,
          showOnSite,
          isActive,
          sortOrder,
          partnershipType,
        },
      });
    } else {
      slug = await uniqueSlug(requestedSlug || name);
      const created = await prisma.brand.create({
        data: {
          name,
          slug,
          description,
          isPartner,
          showOnSite: isPartner ? showOnSite : false,
          isActive: true,
          sortOrder,
          partnershipType,
        },
      });
      brandId = created.id;
    }

    if (logoFile instanceof File && logoFile.size > 0) {
      const logo = await uploadBrandImage(logoFile, brandId, "logo");
      await prisma.brand.update({ where: { id: brandId }, data: { logo } });
    }
    if (bannerFile instanceof File && bannerFile.size > 0) {
      const banner = await uploadBrandImage(bannerFile, brandId, "banner");
      await prisma.brand.update({ where: { id: brandId }, data: { banner } });
    }

    await writeAudit({
      userId: session.userId,
      action: id ? "BRAND_UPDATE" : "BRAND_CREATE",
      entity: "Brand",
      entityId: brandId,
      after: { name, slug, isPartner },
    });
    refreshBrandPages(slug);
    bounce(`/admin/marques/${brandId}`, "ok", id ? "Marque mise à jour." : `${name} ajoutée.`);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      bounce("/admin/marques", "erreur", "Ce slug de marque existe déjà.");
    }
    bounce("/admin/marques", "erreur", err instanceof Error ? err.message : "Marque impossible.");
  }
}

export async function deletePartnerBrand(formData: FormData) {
  try {
    const session = await requireStaff("brands.manage");
    const id = String(formData.get("id") ?? "").trim();
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) bounce("/admin/marques", "erreur", "Marque introuvable.");
    await prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, showOnSite: false },
    });
    await writeAudit({
      userId: session.userId,
      action: "BRAND_DELETE",
      entity: "Brand",
      entityId: id,
      after: { name: brand.name },
    });
    refreshBrandPages(brand.slug);
    bounce("/admin/marques", "ok", `${brand.name} retirée.`);
  } catch (err) {
    unstable_rethrow(err);
    bounce("/admin/marques", "erreur", err instanceof Error ? err.message : "Suppression impossible.");
  }
}

export async function saveBrandCollection(formData: FormData) {
  try {
    await requireStaff("brands.manage");
    const brandId = String(formData.get("brandId") ?? "").trim();
    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!brandId || !name) bounce(`/admin/marques/${brandId || ""}`, "erreur", "Nom de collection requis.");
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.deletedAt) bounce("/admin/marques", "erreur", "Marque introuvable.");
    const kindRaw = String(formData.get("kind") ?? "MANUAL");
    const kind = isCollectionKind(kindRaw) ? kindRaw : "MANUAL";
    const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
    const description = String(formData.get("description") ?? "").trim() || null;
    const sortOrder = Math.max(0, Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0);
    const isActive = !id || formData.get("isActive") === "on";
    const slug = slugify(String(formData.get("slug") ?? "") || name) || "collection";
    const productIds = formData
      .getAll("productId")
      .map((value) => String(value).trim())
      .filter(Boolean);

    let collectionId = id;
    if (id) {
      await prisma.brandCollection.update({
        where: { id },
        data: { name, slug, kind, categoryId, description, sortOrder, isActive },
      });
    } else {
      const created = await prisma.brandCollection.create({
        data: { brandId, name, slug, kind, categoryId, description, sortOrder, isActive: true },
      });
      collectionId = created.id;
    }
    if (kind === "MANUAL") {
      await prisma.brandCollectionProduct.deleteMany({ where: { collectionId } });
      if (productIds.length) {
        await prisma.brandCollectionProduct.createMany({
          data: productIds.map((productId, index) => ({
            collectionId,
            productId,
            sortOrder: index,
          })),
          skipDuplicates: true,
        });
      }
    }
    refreshBrandPages(brand.slug);
    bounce(`/admin/marques/${brandId}`, "ok", id ? "Collection mise à jour." : "Collection créée.");
  } catch (err) {
    unstable_rethrow(err);
    const brandId = String(formData.get("brandId") ?? "").trim();
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      bounce(`/admin/marques/${brandId}`, "erreur", "Ce slug de collection existe déjà.");
    }
    bounce(`/admin/marques/${brandId}`, "erreur", err instanceof Error ? err.message : "Collection impossible.");
  }
}

export async function deleteBrandCollection(formData: FormData) {
  try {
    await requireStaff("brands.manage");
    const id = String(formData.get("id") ?? "").trim();
    const brandId = String(formData.get("brandId") ?? "").trim();
    const collection = await prisma.brandCollection.findUnique({
      where: { id },
      include: { brand: { select: { slug: true } } },
    });
    if (!collection) bounce(`/admin/marques/${brandId}`, "erreur", "Collection introuvable.");
    await prisma.brandCollection.delete({ where: { id } });
    refreshBrandPages(collection.brand.slug);
    bounce(`/admin/marques/${brandId}`, "ok", "Collection supprimée.");
  } catch (err) {
    unstable_rethrow(err);
    const brandId = String(formData.get("brandId") ?? "").trim();
    bounce(`/admin/marques/${brandId}`, "erreur", err instanceof Error ? err.message : "Suppression impossible.");
  }
}
