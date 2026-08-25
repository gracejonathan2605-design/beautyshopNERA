import { describe, expect, it } from "vitest";
import { PRINTING_TICKET_CLASS, RECEIPT_PRINT_CLONE_CLASS } from "../src/lib/print-ticket";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("impression ticket", () => {
  it("n’utilise que le format thermique 80 mm", () => {
    const css = readFileSync(resolve(__dirname, "../src/app/globals.css"), "utf8");
    const helper = readFileSync(resolve(__dirname, "../src/lib/print-ticket.ts"), "utf8");
    expect(PRINTING_TICKET_CLASS).toBe("printing-ticket");
    expect(RECEIPT_PRINT_CLONE_CLASS).toBe("receipt-print-clone");
    expect(css).toContain("size: 80mm auto");
    expect(css).not.toContain("size: A4");
    expect(helper).toContain("80mm");
    expect(helper).not.toContain("printing-a4");
    expect(helper).toContain("data-nera-thermal");
  });
});
