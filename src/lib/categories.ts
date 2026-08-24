export function categoryDeleteBlocker(input: {
  childCount: number;
  productCount: number;
}): string | null {
  if (input.childCount > 0) {
    return "Supprimez d’abord les sous-rayons de ce rayon.";
  }
  if (input.productCount > 0) {
    return `${input.productCount} produit(s) sont encore dans ce rayon. Déplacez-les ou archivez-les avant de supprimer.`;
  }
  return null;
}
