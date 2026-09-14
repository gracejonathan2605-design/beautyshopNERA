export const PHOTO_SHORT_MAX = 160;
export const PHOTO_LONG_MAX = 420;
/** Vision via AI Gateway — flash récent, assez économique pour des fiches produit. */
export const PHOTO_DESCRIPTION_MODEL = "google/gemini-3.8-flash";
export const PHOTO_DESCRIPTION_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_DESCRIPTION_CONCURRENCY = 2;

export const PHOTO_AI_UNAVAILABLE =
  "Suggestion indisponible : configurez l’IA (clé AI Gateway en local, ou OIDC sur Vercel).";

export type PhotoDescriptionDraft = {
  shortDescription: string;
  description: string;
};

export type PhotoDescriptionResult =
  | ({ ok: true } & PhotoDescriptionDraft)
  | { ok: false; error: string };

export function photoAiReady() {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL);
}

export function isPhotoDescriptionConfigError(message?: string | null) {
  return Boolean(message && /indisponible|non configurée|clé AI Gateway|OIDC/i.test(message));
}

export function photoDescriptionInstructions() {
  return [
    "Tu rédiges des fiches produit pour NERA Beauté & Shop, boutique à Yaoundé (Cameroun).",
    "Règles strictes :",
    "- Français simple, ton boutique, sans emoji ni hashtag.",
    "- Décris uniquement ce qui se voit sur la photo (type d’article, couleur, forme, matière apparente).",
    "- N’invente aucune caractéristique : ingrédients, marque absente, certifications, taille, prix, origine, effets médicaux.",
    "- Si une marque ou un texte est lisible sur la photo, tu peux le reprendre tel quel.",
    "- Si la photo n’est pas un produit vendable, renvoie des chaînes vides.",
  ].join("\n");
}

export function photoDescriptionUserPrompt(input: { name?: string; category?: string } = {}) {
  const name = input.name?.replace(/\s+/g, " ").trim();
  const category = input.category?.replace(/\s+/g, " ").trim();
  const hints = [
    name ? `Nom saisi (indice seulement) : ${name}.` : "",
    category ? `Rayon (indice seulement) : ${category}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    "Propose une courte description boutique pour cette photo.",
    hints,
    "Si le nom ou le rayon contredisent la photo, suis la photo.",
    `shortDescription : une phrase, ${PHOTO_SHORT_MAX} caractères max.`,
    `description : deux ou trois phrases, ${PHOTO_LONG_MAX} caractères max.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function sanitizePhotoCopy(text: string, max: number) {
  const value = String(text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return "";
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export function finalizePhotoDescriptionSuggestion(
  raw: { shortDescription?: string | null; description?: string | null } | null | undefined,
): PhotoDescriptionDraft | null {
  if (!raw) return null;
  const shortFromShort = sanitizePhotoCopy(raw.shortDescription ?? "", PHOTO_SHORT_MAX);
  const longFromLong = sanitizePhotoCopy(raw.description ?? "", PHOTO_LONG_MAX);
  const shortDescription = shortFromShort || sanitizePhotoCopy(longFromLong, PHOTO_SHORT_MAX);
  const description = longFromLong || shortDescription;
  if (!shortDescription) return null;
  return { shortDescription, description };
}

export function parsePhotoDescriptionPayload(raw: string): PhotoDescriptionDraft | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  try {
    const parsed = JSON.parse(candidate) as { shortDescription?: string; description?: string };
    if (parsed && typeof parsed === "object") {
      return finalizePhotoDescriptionSuggestion(parsed);
    }
  } catch {
    // texte libre
  }
  return finalizePhotoDescriptionSuggestion({ shortDescription: candidate, description: candidate });
}

/** La suggestion n’est jamais écrite tant que le personnel n’a pas choisi « utiliser ». */
export function resolvePhotoDescriptionChoice(input: {
  current: string;
  suggestion: string;
  choice: "use" | "ignore";
}) {
  return input.choice === "use" ? input.suggestion : input.current;
}

export function createAsyncLimiter(max: number) {
  const limit = Math.max(1, max);
  let active = 0;
  const waiting: Array<() => void> = [];

  async function acquire() {
    if (active >= limit) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active += 1;
  }

  function release() {
    active -= 1;
    waiting.shift()?.();
  }

  return async function limitFn<T>(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

export function mapPhotoAiError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/api key|unauthoriz|oidc|credential|forbidden|401|403|missing.*key/i.test(message)) {
    return PHOTO_AI_UNAVAILABLE;
  }
  if (/timeout|timed out|aborted/i.test(message)) {
    return "L’analyse a pris trop de temps. Réessayez, ou saisissez la description à la main.";
  }
  return "Aucune description fiable n’a pu être proposée. Saisissez-la à la main, ou réessayez.";
}
