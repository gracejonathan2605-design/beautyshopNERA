export function printRestockDocument(html: string) {
  document.querySelectorAll("iframe[data-nera-restock]").forEach((node) => node.remove());
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-nera-restock", "1");
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "Impression de la liste d’achats";
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => iframe.remove();
  iframe.contentWindow?.addEventListener("afterprint", cleanup);
  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 50);
}
