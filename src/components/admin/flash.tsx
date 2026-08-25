export function AdminFlash({
  ok,
  erreur,
}: {
  ok?: string;
  erreur?: string;
}) {
  if (!ok && !erreur) return null;
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        erreur
          ? "border border-red-200 bg-red-50 text-red-800"
          : "border border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
      role={erreur ? "alert" : "status"}
    >
      {erreur ?? ok}
    </p>
  );
}
