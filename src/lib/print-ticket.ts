export const RECEIPT_PRINT_CLONE_CLASS = "receipt-print-clone";
export const PRINTING_TICKET_CLASS = "printing-ticket";

const THERMAL_CSS = `
@page { size: 80mm 120mm; margin: 0; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 80mm;
  background: #fff;
  color: #000;
}
body {
  font-family: ui-monospace, Menlo, Consolas, monospace;
}
.receipt-paper {
  width: 76mm;
  margin: 0 auto;
  padding: 2mm 3mm;
  font-size: 12px;
  line-height: 1.35;
  background: #fff;
  color: #000;
}
.receipt-logo {
  display: block;
  width: 22mm;
  height: 22mm;
  margin: 0 auto 2mm;
  object-fit: cover;
  border-radius: 50%;
}
.text-center { text-align: center; }
.font-serif { font-family: Georgia, "Times New Roman", serif; }
.text-lg { font-size: 16px; }
.leading-5 { line-height: 1.25; }
.tracking-\\[0\\.18em\\], [class*="tracking-"] { letter-spacing: 0.12em; }
.mt-1 { margin-top: 1mm; }
.mt-2 { margin-top: 2mm; }
.mt-3 { margin-top: 3mm; }
.my-2 { margin-top: 2mm; margin-bottom: 2mm; }
.opacity-80 { opacity: 0.85; }
.border-t { border-top: 1px dashed #111; }
.border-dashed { border-top-style: dashed; }
.pt-2 { padding-top: 2mm; }
.py-2 { padding-top: 2mm; padding-bottom: 2mm; }
.space-y-1 > * + * { margin-top: 1mm; }
.uppercase { text-transform: uppercase; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.text-sm { font-size: 13px; }
.font-bold { font-weight: 700; }
`;

function pxToMm(px: number) {
  return Math.max(70, Math.ceil((px * 25.4) / 96) + 8);
}

export function printReceiptElement(source: HTMLElement) {
  if (typeof document === "undefined") return;

  document.querySelectorAll("iframe[data-nera-thermal]").forEach((node) => node.remove());

  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-nera-thermal", "1");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:80mm;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    window.print();
    return;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add(RECEIPT_PRINT_CLONE_CLASS);
  clone.removeAttribute("id");
  for (const img of clone.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", new URL(src, window.location.origin).href);
  }

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket NERA</title><style id="thermal">${THERMAL_CSS}</style></head><body></body></html>`,
  );
  doc.close();
  doc.body.appendChild(doc.importNode(clone, true));

  const finish = () => {
    const heightMm = pxToMm(Math.max(doc.body.scrollHeight, clone.scrollHeight));
    const style = doc.getElementById("thermal");
    if (style) {
      style.textContent = THERMAL_CSS.replace("80mm 120mm", `80mm ${heightMm}mm`);
    }
    iframe.style.height = `${heightMm}mm`;
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };

  const cleanup = () => {
    iframe.remove();
  };
  iframe.contentWindow?.addEventListener("afterprint", cleanup);

  const images = [...doc.images];
  if (!images.length || images.every((img) => img.complete)) {
    window.setTimeout(finish, 50);
    return;
  }
  Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => window.setTimeout(finish, 50));
}

export function printReceiptFallback() {
  document.documentElement.classList.add(PRINTING_TICKET_CLASS);
  const cleanup = () => {
    document.documentElement.classList.remove(PRINTING_TICKET_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
