import { describe, expect, it } from "vitest";
import {
  assignFlashOnPublish,
  flashEndFromStart,
  flashShopBadges,
  formatFlashCountdown,
  isFlashActive,
  isPublishedOnline,
  remainingMs,
} from "../src/lib/flash";
import { promoPercent } from "../src/lib/pricing";
import { isMissingFlashColumn } from "../src/lib/product-query";
import { Prisma } from "@prisma/client";

const start = new Date("2026-08-25T15:30:00.000Z");

function product(overrides: Partial<Parameters<typeof isFlashActive>[0]> = {}) {
  return {
    status: "ACTIVE",
    onlineVisible: true,
    deletedAt: null,
    flashStartAt: start,
    flashEndAt: flashEndFromStart(start, 10),
    ...overrides,
  };
}

describe("FLASH NERA — publication", () => {
  it("active le Flash à la première publication", () => {
    const flash = assignFlashOnPublish({
      wasPublished: false,
      willBePublished: true,
      now: start,
      durationDays: 10,
    });
    expect(flash.flashStartAt?.toISOString()).toBe(start.toISOString());
    expect(flash.flashEndAt?.toISOString()).toBe("2026-09-04T15:30:00.000Z");
    expect(isFlashActive({ ...product(flash), status: "ACTIVE", onlineVisible: true }, start)).toBe(true);
  });

  it("ne met pas un brouillon en Flash", () => {
    const flash = assignFlashOnPublish({
      wasPublished: false,
      willBePublished: false,
      now: start,
      durationDays: 10,
    });
    expect(flash.flashStartAt).toBeNull();
    expect(isFlashActive(product({ status: "DRAFT", ...flash }), start)).toBe(false);
    expect(isPublishedOnline({ status: "DRAFT", onlineVisible: false })).toBe(false);
  });

  it("reste Flash tant que flashEndAt n’est pas atteint", () => {
    const during = new Date("2026-08-28T10:00:00.000Z");
    expect(isFlashActive(product(), during)).toBe(true);
  });

  it("termine le Flash à flashEndAt exact", () => {
    const end = flashEndFromStart(start, 10);
    expect(isFlashActive(product(), end)).toBe(false);
    expect(formatFlashCountdown(remainingMs(end, end)).urgency).toBe("expired");
  });

  it("retire le produit du Flash après expiration, sans le dépublier", () => {
    const after = new Date("2026-09-05T00:00:00.000Z");
    const row = product();
    expect(isFlashActive(row, after)).toBe(false);
    expect(isPublishedOnline(row)).toBe(true);
  });

  it("ne réinitialise pas le Flash à une modification", () => {
    const first = assignFlashOnPublish({
      wasPublished: false,
      willBePublished: true,
      now: start,
      durationDays: 10,
    });
    const edited = assignFlashOnPublish({
      alreadyStarted: first.flashStartAt,
      alreadyEnded: first.flashEndAt,
      wasPublished: true,
      willBePublished: true,
      now: new Date("2026-08-29T12:00:00.000Z"),
      durationDays: 15,
    });
    expect(edited.flashStartAt?.toISOString()).toBe(first.flashStartAt?.toISOString());
    expect(edited.flashEndAt?.toISOString()).toBe(first.flashEndAt?.toISOString());
  });

  it("absente un produit dépublié du Flash", () => {
    expect(isFlashActive(product({ onlineVisible: false }), start)).toBe(false);
    expect(isFlashActive(product({ status: "INACTIVE" }), start)).toBe(false);
  });

  it("ne recrée pas un Flash à la republication d’un ancien produit", () => {
    const republish = assignFlashOnPublish({
      alreadyStarted: null,
      alreadyEnded: null,
      wasPublished: true,
      willBePublished: true,
      now: new Date("2026-09-10T10:00:00.000Z"),
      durationDays: 10,
    });
    expect(republish.flashStartAt).toBeNull();
    expect(republish.flashEndAt).toBeNull();
  });

  it("conserve l’historique Flash après dépublication puis republication", () => {
    const first = assignFlashOnPublish({
      wasPublished: false,
      willBePublished: true,
      now: start,
      durationDays: 10,
    });
    const hidden = assignFlashOnPublish({
      alreadyStarted: first.flashStartAt,
      alreadyEnded: first.flashEndAt,
      wasPublished: true,
      willBePublished: false,
      now: new Date("2026-08-26T10:00:00.000Z"),
      durationDays: 10,
    });
    const again = assignFlashOnPublish({
      alreadyStarted: hidden.flashStartAt,
      alreadyEnded: hidden.flashEndAt,
      wasPublished: false,
      willBePublished: true,
      now: new Date("2026-08-27T10:00:00.000Z"),
      durationDays: 10,
    });
    expect(again.flashEndAt?.toISOString()).toBe(first.flashEndAt?.toISOString());
  });
});

describe("FLASH NERA — compteur", () => {
  it("affiche J et H au-delà de 48 h, sans secondes", () => {
    const { label, urgency } = formatFlashCountdown(3 * 86400000 + 14 * 3600000);
    expect(label).toBe("⏳ Plus que 3J 14H");
    expect(urgency).toBe("normal");
    expect(label.toLowerCase()).not.toContain("jours");
    expect(label).not.toMatch(/10 jours/i);
    expect(label).not.toContain("sec");
  });

  it("affiche J et H entre 24 h et 48 h", () => {
    expect(formatFlashCountdown(32 * 3600000).label).toBe("⏳ Plus que 1J 08H");
  });

  it("affiche H et MIN entre 1 h et 24 h", () => {
    const { label, urgency } = formatFlashCountdown(18 * 3600000 + 27 * 60000);
    expect(label).toBe("⏳ Plus que 18H 27MIN");
    expect(urgency).toBe("soon");
  });

  it("passe en MM:SS sous une heure", () => {
    expect(formatFlashCountdown(42 * 60000 + 17 * 1000).label).toBe("⏳ Plus que 42:17");
  });

  it("met en avant l’urgence sous 10 minutes", () => {
    const { label, urgency } = formatFlashCountdown(9 * 60000 + 38 * 1000);
    expect(label).toBe("🔥 Plus que 09:38");
    expect(urgency).toBe("urgent");
  });

  it("n’affiche que MM:SS sous une minute", () => {
    const { label, urgency } = formatFlashCountdown(47 * 1000);
    expect(label).toBe("🔥 00:47");
    expect(urgency).toBe("critical");
  });

  it("n’affiche jamais un temps négatif", () => {
    expect(formatFlashCountdown(-5000).label).toBe("00:00");
    expect(remainingMs(start, new Date(start.getTime() + 1000))).toBe(0);
  });

  it("n’expose jamais la durée totale au client", () => {
    const labels = [
      formatFlashCountdown(10 * 86400000 - 1000).label,
      formatFlashCountdown(3 * 86400000).label,
      formatFlashCountdown(90 * 60 * 1000).label,
      formatFlashCountdown(30 * 1000).label,
    ];
    for (const label of labels) {
      expect(label.toLowerCase()).not.toContain("jours");
      expect(label).not.toMatch(/valable/i);
      expect(label).not.toMatch(/disponible pendant/i);
    }
  });
});

describe("FLASH NERA — badges et promo", () => {
  it("affiche FLASH et PROMO ensemble", () => {
    const badges = flashShopBadges({ flash: true, promoPercent: 15, isNew: true });
    expect(badges.map((b) => b.kind)).toEqual(["flash", "promo", "new"]);
    expect(badges[0].label).toBe("🔥 FLASH");
    expect(badges[1].label).toBe("−15%");
    expect(promoPercent(75000, 63750)).toBe(15);
  });

  it("peut être Flash sans promotion, ou promo sans Flash", () => {
    expect(flashShopBadges({ flash: true, promoPercent: 0 }).map((b) => b.kind)).toEqual(["flash"]);
    expect(flashShopBadges({ flash: false, promoPercent: 20, isPromo: true }).map((b) => b.kind)).toEqual(["promo"]);
  });
});

describe("FLASH NERA — schéma", () => {
  it("reconnaît l’absence de colonnes Flash en base", () => {
    const err = new Prisma.PrismaClientKnownRequestError("column missing", {
      code: "P2022",
      clientVersion: "6.19.3",
      meta: { column: "Product.flashStartAt" },
    });
    expect(isMissingFlashColumn(err)).toBe(true);
    expect(isMissingFlashColumn(new Error("other"))).toBe(false);
  });
});
