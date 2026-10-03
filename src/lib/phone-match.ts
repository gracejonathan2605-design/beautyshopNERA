/** Variantes d’un numéro camerounais (6XXXXXXXX, 06…, 237…). */
export function cameroonPhoneLookupVariants(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (!d) return [];
  const set = new Set<string>([d]);
  if (d.startsWith("237") && d.length >= 12) {
    const local = d.slice(3);
    set.add(local);
    if (local.length === 9) set.add(`0${local}`);
  }
  if (d.startsWith("6") && d.length === 9) {
    set.add(`237${d}`);
    set.add(`0${d}`);
  }
  if (d.startsWith("0") && d.length === 10 && d[1] === "6") {
    set.add(d.slice(1));
    set.add(`237${d.slice(1)}`);
  }
  return [...set];
}

/** Mobile camerounais : 9 chiffres commençant par 6. Accepte le 0 initial et l’indicatif 237. */
export function cameroonMobileLocal(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("237") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (local.length === 9 && local.startsWith("6")) return local;
  return "";
}

export function phoneLastNine(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length < 8) return null;
  return d.slice(-9);
}

export function phonesLikelyMatch(a: string, b: string) {
  const left = phoneLastNine(a);
  const right = phoneLastNine(b);
  if (!left || !right) return false;
  return left === right;
}
