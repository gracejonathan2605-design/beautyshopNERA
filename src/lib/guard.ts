import { redirect } from "next/navigation";
import { getStaffSession, type StaffSession } from "./auth";
import { hasPermission, type PermissionCode } from "./permissions";

export async function requireStaff(permission?: PermissionCode): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  if (permission && !hasPermission(session, permission)) {
    redirect("/admin/interdit");
  }
  return session;
}

export function assertPermission(session: StaffSession, permission: PermissionCode) {
  if (!hasPermission(session, permission)) {
    throw new Error("Permission refusee");
  }
}
