import { requireStaff } from "@/lib/guard";
import { searchPosProducts } from "@/app/actions/pos";
import { getOpenSessionForUser } from "@/services/cash.service";
import { PosClient } from "@/components/pos/pos-client";
import { StaffToolbar } from "@/components/staff/toolbar";
import { getShopSettings } from "@/lib/settings";

export default async function PosPage() {
  const session = await requireStaff("pos.access");
  const [products, open, settings] = await Promise.all([
    searchPosProducts(""),
    getOpenSessionForUser(session.userId),
    getShopSettings(),
  ]);
  return (
    <div className="min-h-screen bg-background">
      <StaffToolbar />
      <div className="p-4 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Point de vente</p>
        <h1 className="mt-1 font-serif text-4xl text-wine">Caisse NERA</h1>
        <p className="mt-1 text-sm text-black/60">
          {session.firstName} {session.lastName}
        </p>
        <div className="mt-6">
          <PosClient
            initial={products}
            openSession={open ? { id: open.id, openingFloat: open.openingFloat } : null}
            shop={{
              name: settings.name,
              slogan: settings.slogan,
              address: settings.address,
              city: `${settings.city}, ${settings.country}`,
              phone: settings.phone,
              ticketFooter: settings.ticketFooter,
            }}
          />
        </div>
      </div>
    </div>
  );
}
