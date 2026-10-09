import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { RestockListPanel } from "@/components/admin/restock-list-panel";
import { loadRestockList } from "@/services/restock-list.service";

export default async function RestockListPage() {
  await requireStaff("stock.view");
  const now = new Date();
  const lines = await loadRestockList(now);
  const finished = lines.filter((line) => line.level === "vide").length;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Stocks</p>
          <h1 className="font-serif text-4xl">Liste d’achats</h1>
          <p className="mt-2 max-w-2xl text-sm text-black/55">
            {finished} produit{finished > 1 ? "s" : ""} fini{finished > 1 ? "s" : ""}. Cochez les lignes, puis imprimez
            le tableau ou envoyez-le sur WhatsApp pour partir renouveler.
          </p>
        </div>
        <Link href="/admin/stocks" className="no-print text-sm underline">
          Retour aux stocks
        </Link>
      </div>
      <RestockListPanel lines={lines} printedAt={now.toISOString()} />
    </div>
  );
}
