import { startOfWeek } from "date-fns";
import { toCsv } from "@/lib/csv";
import { formatCfa } from "@/lib/money";
import { availableQty } from "@/lib/stock-display";
import { whatsappChatUrl } from "@/lib/receipt";

export type RestockLevel = "vide" | "promis" | "bas";

export type RestockSource = {
  inventoryId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  category: string | null;
  location: string;
  onHand: number;
  reserved: number;
  minQuantity: number;
  costPrice: number;
  salePrice: number;
  supplierName: string | null;
  supplierPhone: string | null;
  soldThisWeek: number;
  lastMovementAt: Date | null;
  lastMovementType: string | null;
};

export type RestockLine = {
  id: string;
  variantId: string;
  level: RestockLevel;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string;
  category: string;
  location: string;
  onHand: number;
  reserved: number;
  available: number;
  minQuantity: number;
  soldThisWeek: number;
  buyQty: number;
  costPrice: number;
  salePrice: number;
  supplierName: string;
  supplierPhone: string;
  lastMovement: string;
};

const MOVE_LABEL: Record<string, string> = {
  PURCHASE: "Réception",
  SALE_POS: "Vente caisse",
  SALE_ONLINE: "Vente en ligne",
  RETURN: "Retour",
  ADJUSTMENT: "Ajustement",
  LOSS: "Perte",
  DONATION: "Don",
  CANCELLATION: "Annulation",
};

export function restockWeekStart(now = new Date()) {
  return startOfWeek(now, { weekStartsOn: 1 });
}

export function restockLevel(onHand: number, reserved: number, minQuantity: number): RestockLevel | null {
  const available = availableQty(onHand, reserved);
  if (available <= 0 && onHand <= 0) return "vide";
  if (available <= 0) return "promis";
  if (available <= minQuantity) return "bas";
  return null;
}

export function suggestedBuyQty(level: RestockLevel, available: number, minQuantity: number, soldThisWeek: number) {
  const target = Math.max(minQuantity, soldThisWeek, 1);
  const missing = target - Math.max(available, 0);
  if (level === "vide") return Math.max(missing, 1);
  return Math.max(missing, 0);
}

export function restockLevelLabel(level: RestockLevel) {
  if (level === "vide") return "Fini";
  if (level === "promis") return "Promis";
  return "Bientôt fini";
}

export function formatRestockWhen(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Douala",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRestockDay(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Douala",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function movementLabel(type: string | null, at: Date | null) {
  if (!type || !at) return "—";
  return `${MOVE_LABEL[type] ?? type} · ${formatRestockWhen(at)}`;
}

export function toRestockLine(source: RestockSource): RestockLine | null {
  const level = restockLevel(source.onHand, source.reserved, source.minQuantity);
  if (!level) return null;
  const available = availableQty(source.onHand, source.reserved);
  return {
    id: source.inventoryId,
    variantId: source.variantId,
    level,
    productName: source.productName,
    variantName: source.variantName,
    sku: source.sku,
    barcode: source.barcode?.trim() || "—",
    category: source.category?.trim() || "—",
    location: source.location,
    onHand: source.onHand,
    reserved: source.reserved,
    available,
    minQuantity: source.minQuantity,
    soldThisWeek: Math.max(0, source.soldThisWeek),
    buyQty: suggestedBuyQty(level, available, source.minQuantity, source.soldThisWeek),
    costPrice: source.costPrice,
    salePrice: source.salePrice,
    supplierName: source.supplierName?.trim() || "—",
    supplierPhone: source.supplierPhone?.trim() || "",
    lastMovement: movementLabel(source.lastMovementType, source.lastMovementAt),
  };
}

export function sortRestockLines(lines: RestockLine[]) {
  const rank: Record<RestockLevel, number> = { vide: 0, bas: 1, promis: 2 };
  return [...lines].sort((a, b) => {
    if (rank[a.level] !== rank[b.level]) return rank[a.level] - rank[b.level];
    if (b.soldThisWeek !== a.soldThisWeek) return b.soldThisWeek - a.soldThisWeek;
    const byName = a.productName.localeCompare(b.productName, "fr");
    if (byName !== 0) return byName;
    return a.variantName.localeCompare(b.variantName, "fr");
  });
}

export function restockBudget(lines: RestockLine[]) {
  return lines.reduce((sum, line) => sum + line.buyQty * line.costPrice, 0);
}

export function restockBuyTotal(lines: RestockLine[]) {
  return lines.reduce((sum, line) => sum + line.buyQty, 0);
}

function lineBlock(line: RestockLine, index: number) {
  const barcode = line.barcode === "—" ? "" : ` · Code ${line.barcode}`;
  const phone = line.supplierPhone ? ` · ${line.supplierPhone}` : "";
  return [
    `${index}. ${line.productName} — ${line.variantName} (${restockLevelLabel(line.level)})`,
    `SKU ${line.sku}${barcode} · ${line.category} · ${line.location}`,
    `Dispo ${line.available} · en rayon ${line.onHand} · réservé ${line.reserved} · seuil ${line.minQuantity}`,
    `Vendus cette semaine : ${line.soldThisWeek} · À acheter : ${line.buyQty}`,
    `Achat ${formatCfa(line.costPrice)} · Vente ${formatCfa(line.salePrice)} · ${line.supplierName}${phone}`,
    `Dernière sortie : ${line.lastMovement}`,
  ].join("\n");
}

export function formatRestockWhatsApp(lines: RestockLine[], when: Date) {
  if (!lines.length) return "";
  const groups: Array<[RestockLevel, string]> = [
    ["vide", "FINIS — à racheter"],
    ["bas", "BIENTÔT FINIS"],
    ["promis", "DÉJÀ PROMIS À UNE COMMANDE"],
  ];
  const parts = [
    "NERA Beauté & Shop",
    `Liste d’achats · ${formatRestockDay(when)}`,
    "Produits à renouveler avant de partir.",
    "",
  ];
  let index = 1;
  for (const [level, title] of groups) {
    const rows = lines.filter((line) => line.level === level);
    if (!rows.length) continue;
    parts.push(title);
    for (const line of rows) {
      parts.push(lineBlock(line, index));
      parts.push("");
      index += 1;
    }
  }
  parts.push(
    `Total : ${lines.length} produit${lines.length > 1 ? "s" : ""} · ${restockBuyTotal(lines)} pièce${restockBuyTotal(lines) > 1 ? "s" : ""} à acheter · budget estimé ${formatCfa(restockBudget(lines))}`,
  );
  return parts.join("\n").trim();
}

/** Le lien WhatsApp reste ouvrable : on coupe la liste en messages courts. */
export function chunkRestockWhatsApp(text: string, budget = 1400) {
  if (!text) return [];
  const reserve = encodeURIComponent("Liste d’achats 99/99\n\n").length;
  const limit = Math.max(400, budget - reserve);
  const blocks = text.split("\n\n");
  const chunks: string[] = [];
  let current = "";
  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block;
    if (encodeURIComponent(next).length <= limit) {
      current = next;
      continue;
    }
    pushCurrent();
    current = block;
  }
  pushCurrent();
  if (chunks.length <= 1) return chunks;
  return chunks.map((chunk, index) => `Liste d’achats ${index + 1}/${chunks.length}\n\n${chunk}`);
}

export function restockWhatsAppUrls(phone: string, lines: RestockLine[], when: Date) {
  return chunkRestockWhatsApp(formatRestockWhatsApp(lines, when))
    .map((text) => whatsappChatUrl(phone, text))
    .filter(Boolean);
}

export const RESTOCK_CSV_HEADERS = [
  "État",
  "Produit",
  "Variante",
  "SKU",
  "Code-barres",
  "Rayon",
  "Emplacement",
  "Dispo",
  "En rayon",
  "Réservé",
  "Seuil",
  "Vendus cette semaine",
  "À acheter",
  "Prix d'achat",
  "Prix de vente",
  "Fournisseur",
  "Téléphone fournisseur",
  "Dernière sortie",
] as const;

export function restockCsv(lines: RestockLine[]) {
  const rows = lines.map((line) => [
    restockLevelLabel(line.level),
    line.productName,
    line.variantName,
    line.sku,
    line.barcode,
    line.category,
    line.location,
    line.available,
    line.onHand,
    line.reserved,
    line.minQuantity,
    line.soldThisWeek,
    line.buyQty,
    line.costPrice,
    line.salePrice,
    line.supplierName,
    line.supplierPhone,
    line.lastMovement,
  ]);
  return `\uFEFF${toCsv([Array.from(RESTOCK_CSV_HEADERS), ...rows])}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function restockPrintHtml(lines: RestockLine[], when: Date) {
  const head = RESTOCK_CSV_HEADERS.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
  const body = lines
    .map((line) => {
      const cells = [
        restockLevelLabel(line.level),
        line.productName,
        line.variantName,
        line.sku,
        line.barcode,
        line.category,
        line.location,
        String(line.available),
        String(line.onHand),
        String(line.reserved),
        String(line.minQuantity),
        String(line.soldThisWeek),
        String(line.buyQty),
        formatCfa(line.costPrice),
        formatCfa(line.salePrice),
        line.supplierName,
        line.supplierPhone || "—",
        line.lastMovement,
      ];
      return `<tr class="${line.level}">${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
    })
    .join("");
  const title = `Liste d’achats NERA — ${formatRestockDay(when)}`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    body { margin: 0; color: #1c1418; font-family: "Segoe UI", sans-serif; }
    h1 { margin: 0; font-family: Georgia, serif; font-size: 22px; }
    p { margin: 4px 0 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d9cfc4; padding: 4px 5px; text-align: left; vertical-align: top; font-size: 9px; }
    th { background: #24141c; color: #fffdfb; }
    tr.vide td { background: #f8e8ea; }
    tr.bas td { background: #fbf6ea; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>NERA Beauté &amp; Shop · Marché Neptune Ahala, face Skymotors, Yaoundé · ${lines.length} ligne${lines.length > 1 ? "s" : ""} · ${restockBuyTotal(lines)} à acheter · budget estimé ${escapeHtml(formatCfa(restockBudget(lines)))}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}
