export function normalizeProductSearch(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/\b(\d+)\s*(gb|tb|mb|mah|hz|ml|mg|kg|cm|mm|g|l|m|v|w)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(black|preta)\b/g, "preto")
    .replace(/\b(white|branca)\b/g, "branco")
    .trim();
}

export function productSearchTerms(query, minimumLength = 2) {
  const normalized = normalizeProductSearch(query);
  const tokens = [...new Set(normalized.split(" ").filter(Boolean))];
  if (tokens.join("").length < minimumLength || tokens.length > 16) return null;

  return {
    exact: tokens.map(token => ` ${token} `),
    // A complete capacity or measurement is specific. A partially typed word can match a prefix.
    prefixes: tokens.map(token => /^\d+(?:gb|tb|mb|mah|hz|ml|mg|kg|cm|mm)$/.test(token) ? ` ${token} ` : ` ${token}`),
    phrase: ` ${normalized} `,
    barcode: /^\d+$/.test(normalized) ? normalized : "",
  };
}
