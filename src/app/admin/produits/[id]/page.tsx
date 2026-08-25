import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guard";
import { deleteProductMedia } from "@/app/actions/admin";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { groupCategoriesForSelect } from "@/lib/catalog";
import Image from "next/image";
import { isFlashActive, formatFlashRemainingAdmin, remainingMs } from "@/lib/flash";

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("products.update");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!product || product.deletedAt) notFound();
  const variant = product.variants[0];
  const photos = product.images.filter((m) => m.kind === "IMAGE");
  const video = product.images.find((m) => m.kind === "VIDEO");

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">Modifier {product.name}</h1>
      <p className="mt-2 text-sm text-black/50">SKU {variant?.sku}</p>
      <FlashAdminPanel
        status={product.status}
        onlineVisible={product.onlineVisible}
        flashStartAt={product.flashStartAt}
        flashEndAt={product.flashEndAt}
        deletedAt={product.deletedAt}
      />
      <ProductEditForm
        productId={product.id}
        name={product.name}
        categoryId={product.categoryId ?? ""}
        salePrice={variant?.salePrice ?? 0}
        costPrice={variant?.costPrice ?? 0}
        promoPrice={variant?.promoPrice ?? null}
        shortDescription={product.shortDescription ?? ""}
        isFeatured={product.isFeatured}
        isPromo={product.isPromo}
        isNew={product.isNew}
        status={product.status}
        onlineVisible={product.onlineVisible}
        photoCount={photos.length}
        hasVideo={Boolean(video)}
        categoryGroups={groupCategoriesForSelect(categories)}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {product.images.map((m) => (
          <figure key={m.id} className="rounded-2xl bg-cream p-2">
            {m.kind === "VIDEO" ? (
              <video src={m.url} className="h-32 w-full rounded-xl object-cover" preload="metadata" />
            ) : (
              <div className="relative h-32 overflow-hidden rounded-xl">
                <Image src={m.url} alt={m.alt ?? ""} fill className="object-cover" sizes="200px" loading="lazy" />
              </div>
            )}
            <form action={deleteProductMedia} className="mt-2 text-center">
              <input type="hidden" name="mediaId" value={m.id} />
              <button className="text-xs text-red-700">Retirer</button>
            </form>
          </figure>
        ))}
      </div>
    </div>
  );
}

function formatAdminWhen(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FlashAdminPanel({
  status,
  onlineVisible,
  flashStartAt,
  flashEndAt,
  deletedAt,
}: {
  status: string;
  onlineVisible: boolean;
  flashStartAt: Date | null;
  flashEndAt: Date | null;
  deletedAt: Date | null;
}) {
  const active = isFlashActive({ status, onlineVisible, deletedAt, flashStartAt, flashEndAt });
  const ended = Boolean(flashStartAt && flashEndAt && !active);
  const state = !flashStartAt ? "AUCUN" : active ? "ACTIF" : ended ? "TERMINÉ" : "INACTIF";
  return (
    <section className="mt-5 rounded-2xl border border-[#eee0e6] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">FLASH NERA</p>
      <p className="mt-1 font-medium text-wine">Statut : {state}</p>
      <p className="mt-2 text-sm text-black/55">
        Début : {formatAdminWhen(flashStartAt)}
        <br />
        Fin : {formatAdminWhen(flashEndAt)}
        {active && flashEndAt ? (
          <>
            <br />
            Temps restant : {formatFlashRemainingAdmin(remainingMs(flashEndAt))}
          </>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-black/40">
        Une republication ne relance pas le Flash. Modifier le prix ou les photos non plus.
      </p>
    </section>
  );
}
