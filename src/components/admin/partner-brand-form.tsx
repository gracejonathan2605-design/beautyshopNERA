"use client";

import { useTransition } from "react";
import { savePartnerBrand } from "@/app/actions/partner-brands";
import { compressImageFile } from "@/lib/client-compress";
import { PRODUCT_IMAGE_ACCEPT } from "@/lib/product-images";
import { PARTNERSHIP_TYPE_LABELS } from "@/lib/partner-brands";
import { PendingSubmitButton } from "@/components/admin/form-pending";

export function PartnerBrandForm({
  brand,
}: {
  brand?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isPartner: boolean;
    showOnSite: boolean;
    isActive: boolean;
    sortOrder: number;
    partnershipType: string;
    logo: string | null;
    banner: string | null;
  };
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-2xl bg-cream p-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        start(async () => {
          const fd = new FormData(form);
          for (const key of ["logo", "banner"] as const) {
            const file = fd.get(key);
            if (file instanceof File && file.size > 0) {
              fd.set(key, await compressImageFile(file));
            }
          }
          await savePartnerBrand(fd);
        });
      }}
    >
      {brand ? <input type="hidden" name="id" value={brand.id} /> : null}
      <input name="name" required defaultValue={brand?.name ?? ""} placeholder="Nom de la marque *" className="rounded-xl border px-3 py-2" />
      <input name="slug" defaultValue={brand?.slug ?? ""} placeholder="Slug (ex. nakae-beaute)" className="rounded-xl border px-3 py-2" />
      <textarea
        name="description"
        defaultValue={brand?.description ?? ""}
        rows={3}
        placeholder="Présentation publique (uniquement des infos réelles)"
        className="rounded-xl border px-3 py-2 md:col-span-2"
      />
      <select name="partnershipType" defaultValue={brand?.partnershipType ?? "UNSET"} className="rounded-xl border px-3 py-2">
        {Object.entries(PARTNERSHIP_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        name="sortOrder"
        type="number"
        min={0}
        defaultValue={brand?.sortOrder ?? 1}
        placeholder="Ordre d’affichage"
        className="rounded-xl border px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPartner" defaultChecked={brand?.isPartner ?? true} /> Marque partenaire (page /marques)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="showOnSite" defaultChecked={brand?.showOnSite ?? true} /> Visible sur le site
      </label>
      {brand ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={brand.isActive} /> Active
        </label>
      ) : null}
      <label className="text-sm md:col-span-2">
        Logo
        <input type="file" name="logo" accept={PRODUCT_IMAGE_ACCEPT} className="mt-1 block w-full text-sm" />
        {brand?.logo ? <span className="mt-1 block text-xs text-black/45">Un logo est déjà enregistré. Envoyer un fichier le remplace.</span> : null}
      </label>
      <label className="text-sm md:col-span-2">
        Bannière
        <input type="file" name="banner" accept={PRODUCT_IMAGE_ACCEPT} className="mt-1 block w-full text-sm" />
        {brand?.banner ? <span className="mt-1 block text-xs text-black/45">Une bannière est déjà enregistrée. Envoyer un fichier la replace.</span> : null}
      </label>
      <p className="text-xs text-black/45 md:col-span-2">
        Type de partenariat, logo et bannière : visibles en admin. Le client ne voit jamais les conditions financières.
      </p>
      <PendingSubmitButton
        pending={pending}
        idle={brand ? "Enregistrer la marque" : "Ajouter la marque"}
        pendingLabel="Enregistrement…"
        className="rounded-full bg-brown py-2 text-cream md:col-span-2"
      />
    </form>
  );
}
