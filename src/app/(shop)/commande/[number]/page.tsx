import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCfa } from "@/lib/money";

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: true, payments: true },
  });
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-serif text-5xl">Commande {order.number}</h1>
      <p className="mt-2 text-black/60">Statut : {order.status}</p>
      <ul className="mt-6 space-y-2">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between">
            <span>
              {i.productName} × {i.quantity}
            </span>
            <span>{formatCfa(i.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-right font-serif text-3xl">{formatCfa(order.total)}</p>
    </div>
  );
}
