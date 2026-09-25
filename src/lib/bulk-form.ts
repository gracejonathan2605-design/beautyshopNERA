export type BulkFieldValues = {
  name: string;
  shortDescription: string;
  description: string;
  salePrice: string;
  promoPrice: string;
  costPrice: string;
  categoryId: string;
  brandId: string;
  supplierId: string;
  stock: string;
  sku: string;
  barcode: string;
  isFeatured: boolean;
  isPromo: boolean;
  isNew: boolean;
  onlineVisible: boolean;
  variantLabels?: string;
};

import { formatVariantLabels, parseVariantLabels } from "@/lib/variant-options";

export { formatVariantLabels };

export function fillBulkProductFormData(fd: FormData, row: BulkFieldValues) {
  fd.set("name", row.name.trim());
  fd.set("shortDescription", row.shortDescription.trim());
  fd.set("description", row.description.trim());
  fd.set("categoryId", row.categoryId);
  if (row.brandId) fd.set("brandId", row.brandId);
  if (row.supplierId) fd.set("supplierId", row.supplierId);
  const labels = parseVariantLabels(row.variantLabels);
  const names = labels.length ? labels : ["Standard"];
  names.forEach((name, index) => {
    fd.append("variantName", name);
    fd.append("variantSalePrice", row.salePrice.trim());
    fd.append("variantPromoPrice", row.promoPrice.trim());
    fd.append("variantCostPrice", row.costPrice.trim());
    fd.append("variantBarcode", index === 0 ? row.barcode.trim() : "");
    fd.append("variantStock", row.stock.trim());
  });
  if (row.sku.trim()) fd.set("sku", row.sku.trim());
  if (row.isFeatured) fd.set("isFeatured", "on");
  if (row.isPromo || row.promoPrice.trim()) fd.set("isPromo", "on");
  if (row.isNew) fd.set("isNew", "on");
  if (row.onlineVisible) fd.set("onlineVisible", "on");
}
