import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? undefined,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? undefined,
      before: input.before,
      after: input.after,
    },
  });
}

export async function notify(input: {
  type: string;
  title: string;
  message: string;
  userId?: string | null;
}) {
  await prisma.notification.create({ data: input });
}
