"use client";

import { useMemo, useState } from "react";
import { NERA_IDENTITY } from "@/lib/nera-identity";
import { printRestockDocument } from "@/lib/restock-print";
import {
  formatRestockDay,
  formatRestockWhatsApp,
  restockBudget,
  restockBuyTotal,
  restockCsv,
  restockLevelLabel,
  restockPrintHtml,
  restockWhatsAppUrls,
  type RestockLine,
} from "@/lib/restock-list";
import { formatCfa } from "@/lib/money";

type Filter = "vide" | "bas" | "promis" | "tous";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "vide", label: "Finis" },
  { id: "bas", label: "Bientôt finis" },
  { id: "promis", label: "Promis" },
  { id: "tous", label: "Tout" },
];

function idsFor(lines: RestockLine[], filter: Filter) {
  return lines.filter((line) => filter === "tous" || line.level === filter).map((line) => line.id);
}

export function RestockListPanel({ lines, printedAt }: { lines: RestockLine[]; printedAt: string }) {
  const when = useMemo(() => new Date(printedAt), [printedAt]);
  const [filter, setFilter] = useState<Filter>("vide");
  const [checked, setChecked] = useState<string[]>(() => idsFor(lines, "vide"));
  const [copied, setCopied] = useState(false);

  const visible = lines.filter((line) => filter === "tous" || line.level === filter);
  const selected = lines.filter((line) => checked.includes(line.id) && visible.some((row) => row.id === line.id));
  const counts = {
    vide: lines.filter((line) => line.level === "vide").length,
    bas: lines.filter((line) => line.level === "bas").length,
    promis: lines.filter((line) => line.level === "promis").length,
  };
  const allVisibleChecked = visible.length > 0 && visible.every((line) => checked.includes(line.id));

  function show(next: Filter) {
    setFilter(next);
    setChecked(idsFor(lines, next));
    setCopied(false);
  }

  function toggle(id: string) {
    setChecked((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]));
    setCopied(false);
  }

  function toggleVisible() {
    setChecked(allVisibleChecked ? [] : visible.map((line) => line.id));
    setCopied(false);
  }

  const urls = restockWhatsAppUrls(NERA_IDENTITY.phoneE164, selected, when);

  function downloadCsv() {
    const blob = new Blob([restockCsv(selected)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nera-liste-achats.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(formatRestockWhatsApp(selected, when));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="no-print mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count = item.id === "tous" ? lines.length : counts[item.id];
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => show(item.id)}
              className={`rounded-full border px-4 py-2 text-sm ${active ? "border-brown bg-brown text-cream" : "bg-white"}`}
              aria-pressed={active}
            >
              {item.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => printRestockDocument(restockPrintHtml(selected, when))}
          className="rounded-full bg-brown px-4 py-2 text-sm text-cream disabled:opacity-40"
        >
          Imprimer
        </button>
        {urls.map((url, index) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-brown px-4 py-2 text-sm text-brown"
          >
            {urls.length > 1 ? `WhatsApp ${index + 1}/${urls.length}` : "Envoyer sur WhatsApp"}
          </a>
        ))}
        <button
          type="button"
          disabled={!selected.length}
          onClick={downloadCsv}
          className="rounded-full border px-4 py-2 text-sm disabled:opacity-40"
        >
          Télécharger le tableau
        </button>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => void copyList()}
          className="rounded-full border px-4 py-2 text-sm disabled:opacity-40"
        >
          {copied ? "Copié" : "Copier"}
        </button>
        <p className="text-sm text-black/55">
          {selected.length} sélectionné{selected.length > 1 ? "s" : ""} · {restockBuyTotal(selected)} à acheter · budget{" "}
          {formatCfa(restockBudget(selected))}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-cream p-8 text-black/55">
          {filter === "vide"
            ? "Aucun produit fini. Le rayon est encore approvisionné."
            : "Rien dans cette liste."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="text-black/50">
                <th className="no-print p-3">
                  <input type="checkbox" checked={allVisibleChecked} onChange={toggleVisible} aria-label="Tout sélectionner" />
                </th>
                <th className="p-3">État</th>
                <th>Produit</th>
                <th>Variante</th>
                <th>SKU</th>
                <th>Code-barres</th>
                <th>Rayon</th>
                <th>Emplacement</th>
                <th>Dispo</th>
                <th>En rayon</th>
                <th>Réservé</th>
                <th>Seuil</th>
                <th>Vendus</th>
                <th>À acheter</th>
                <th>Achat</th>
                <th>Vente</th>
                <th>Fournisseur</th>
                <th>Dernière sortie</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((line) => (
                <tr
                  key={line.id}
                  className={`border-t border-black/5 ${line.level === "vide" ? "bg-[#f8e8ea]" : "bg-cream"}`}
                >
                  <td className="no-print p-3">
                    <input
                      type="checkbox"
                      checked={checked.includes(line.id)}
                      onChange={() => toggle(line.id)}
                      aria-label={`Sélectionner ${line.productName}`}
                    />
                  </td>
                  <td className="p-3">{restockLevelLabel(line.level)}</td>
                  <td className="font-medium">{line.productName}</td>
                  <td>{line.variantName}</td>
                  <td>{line.sku}</td>
                  <td>{line.barcode}</td>
                  <td>{line.category}</td>
                  <td>{line.location}</td>
                  <td>{line.available}</td>
                  <td>{line.onHand}</td>
                  <td>{line.reserved}</td>
                  <td>{line.minQuantity}</td>
                  <td>{line.soldThisWeek}</td>
                  <td className="font-medium">{line.buyQty}</td>
                  <td>{formatCfa(line.costPrice)}</td>
                  <td>{formatCfa(line.salePrice)}</td>
                  <td>
                    {line.supplierName}
                    {line.supplierPhone ? <span className="block text-xs text-black/50">{line.supplierPhone}</span> : null}
                  </td>
                  <td>{line.lastMovement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="no-print mt-4 max-w-3xl text-sm text-black/50">
        « Fini » : plus rien en rayon, à racheter. « Bientôt fini » : encore quelques pièces, sous le seuil. « Promis » :
        le disponible est à zéro parce qu’une commande les réserve déjà — elles sont encore physiquement là.
        Vendus : sorties caisse et commandes expédiées depuis lundi. Impression au format A4 paysage. WhatsApp ouvre la
        conversation de la boutique ({NERA_IDENTITY.phoneDisplay}) avec la liste prête à envoyer. Liste du {formatRestockDay(when)}.
      </p>
    </div>
  );
}
