export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="bg-wine px-5 py-12 md:px-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="h-3 w-28 animate-pulse rounded-full bg-champagne/30" />
          <div className="mt-5 h-14 w-2/3 max-w-md animate-pulse rounded-full bg-cream/15" />
        </div>
      </div>
      <div className="grid border-b border-gold/30 bg-wine sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="px-5 py-5">
            <div className="h-3 w-16 animate-pulse rounded-full bg-gold/40" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-cream/20" />
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-4/5 animate-pulse rounded-[1.7rem] bg-champagne" />
          ))}
        </div>
      </div>
    </div>
  );
}
