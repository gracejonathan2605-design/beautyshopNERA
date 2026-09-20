import { getStaffSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { StaffToolbarView } from "@/components/staff/toolbar-view";

export async function StaffToolbar() {
  const session = await getStaffSession().catch(() => null);
  if (!session) return null;
  return (
    <StaffToolbarView
      firstName={session.firstName}
      lastName={session.lastName}
      roleName={session.roleName}
      pos={hasPermission(session, "pos.access")}
      admin={hasPermission(session, "dashboard.view")}
    />
  );
}
