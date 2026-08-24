import { requireStaff } from "@/lib/guard";
import { searchPosProducts } from "@/app/actions/pos";
import { getOpenSessionForUser } from "@/services/cash.service";
import { PosClient } from "@/components/pos/pos-client";
import { StaffToolbar } from "@/components/staff/toolbar";

export default async function PosPage() {
  const session = await requireStaff("pos.access");
  const [products, open] = await Promise.all([
    searchPosProducts(""),
    getOpenSessionForUser(session.userId),
  ]);
  return (
    <div className="min-h-screen bg-background">
      <StaffToolbar />
      <div className="p-4 md:p-8">
        <h1 className="font-serif text-4xl">Caisse NERA</h1>
        <p className="mt-1 text-sm text-black/60">
          {session.firstName} {session.lastName}
        </p>
        <div className="mt-6">
          <PosClient
            initial={products}
            openSession={open ? { id: open.id, openingFloat: open.openingFloat } : null}
          />
        </div>
      </div>
    </div>
  );
}
