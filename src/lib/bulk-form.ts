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
};

export function fillBulkProductFormData(fd: FormData, row: BulkFieldValues) {
  fd.set("name", row.name.trim());
  fd.set("shortDescription", row.shortDescription.trim());
  fd.set("description", row.description.trim());
  fd.set("categoryId", row.categoryId);
  if (row.brandId) fd.set("brandId", row.brandId);
  if (row.supplierId) fd.set("supplierId", row.supplierId);
  fd.set("variantName", "Standard");
  fd.set("variantSalePrice", row.salePrice.trim());
  fd.set("variantPromoPrice", row.promoPrice.trim());
  fd.set("variantCostPrice", row.costPrice.trim());
  fd.set("variantBarcode", row.barcode.trim());
  fd.set("variantStock", row.stock.trim());
  if (row.sku.trim()) fd.set("sku", row.sku.trim());
  if (row.isFeatured) fd.set("isFeatured", "on");
  if (row.isPromo || row.promoPrice.trim()) fd.set("isPromo", "on");
  if (row.isNew) fd.set("isNew", "on");
  if (row.onlineVisible) fd.set("onlineVisible", "on");
}
