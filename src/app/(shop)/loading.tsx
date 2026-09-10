export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-40 animate-pulse rounded-full bg-[#f3e6ea]" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-4/5 animate-pulse rounded-[1.7rem] bg-[#f7eef1]" />
        ))}
      </div>
    </div>
  );
}
