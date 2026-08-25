import { describe, expect, it } from "vitest";
import { PRINTING_TICKET_CLASS, RECEIPT_PRINT_CLONE_CLASS } from "../src/lib/print-ticket";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("impression ticket", () => {
  it("les classes print existent dans le CSS", () => {
    const css = readFileSync(resolve(__dirname, "../src/app/globals.css"), "utf8");
    expect(PRINTING_TICKET_CLASS).toBe("printing-ticket");
    expect(RECEIPT_PRINT_CLONE_CLASS).toBe("receipt-print-clone");
    expect(css).toContain("html.printing-ticket");
    expect(css).toContain(".receipt-print-clone");
    expect(css).toContain("size: 80mm auto");
  });
});
