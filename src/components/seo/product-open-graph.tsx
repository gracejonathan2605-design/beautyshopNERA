export function ProductOpenGraphTags({
  price,
  inStock,
  brand,
}: {
  price?: number | null;
  inStock: boolean;
  brand?: string | null;
}) {
  return (
    <>
      <meta property="og:type" content="product" />
      {price != null && price > 0 ? (
        <>
          <meta property="product:price:amount" content={String(price)} />
          <meta property="product:price:currency" content="XAF" />
        </>
      ) : null}
      <meta property="product:availability" content={inStock ? "in stock" : "oos"} />
      {brand ? <meta property="product:brand" content={brand} /> : null}
    </>
  );
}
