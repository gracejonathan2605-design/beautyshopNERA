export const RECEIPT_PRINT_CLONE_CLASS = "receipt-print-clone";
export const PRINTING_TICKET_CLASS = "printing-ticket";

export function printReceiptElement(source: HTMLElement) {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`.${RECEIPT_PRINT_CLONE_CLASS}`).forEach((node) => node.remove());

  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add(RECEIPT_PRINT_CLONE_CLASS);
  clone.removeAttribute("id");
  for (const img of clone.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", new URL(src, window.location.origin).href);
  }
  document.body.appendChild(clone);
  document.documentElement.classList.add(PRINTING_TICKET_CLASS);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clone.remove();
    document.documentElement.classList.remove(PRINTING_TICKET_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}
