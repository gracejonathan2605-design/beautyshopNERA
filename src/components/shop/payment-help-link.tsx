import { paymentFailureWhatsAppUrl } from "@/lib/payments/payment-help";

export function PaymentHelpLink({ orderNumber }: { orderNumber?: string }) {
  const href = paymentFailureWhatsAppUrl(orderNumber);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex w-full items-center justify-center rounded-full border border-wine/30 bg-white px-6 py-3 text-center text-sm text-wine"
    >
      Assistance WhatsApp
    </a>
  );
}
