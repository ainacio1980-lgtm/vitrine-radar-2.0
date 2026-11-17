export function normalizeProductSearch(text) {
  return String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/\b(\d+)\s*(gb|tb|mb|mah|hz|ml|mg|kg|cm|mm|g|l|m|v|w)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(black|preta)\b/g, "preto")
    .replace(/\b(white|branca)\b/g, "branco")
    .trim();
}

// Capacities, device model codes and variants cannot match a longer prefix.
// Keep prefixes only for ordinary words while the customer is typing.
function requiresExactToken(token) {
  return /^(?:\d+(?:gb|tb|mb|mah|hz|ml|mg|kg|cm|mm)|[a-z]{1,5}\d+[a-z0-9]*|preto|branco|azul|verde|rosa|cinza|prata|dourado|pro|ultra|plus|max)$/.test(token);
}

export function productSearchTerms(query, minimumLength = 2) {
  const normalized = normalizeProductSearch(query);
  const tokens = [...new Set(normalized.split(" ").filter(Boolean))];
  if (tokens.join("").length < minimumLength || tokens.length > 16) return null;

  return {
    exact: tokens.map(token => ` ${token} `),
    // A complete capacity or measurement is specific. A partially typed word can match a prefix.
    prefixes: tokens.map(token => requiresExactToken(token) ? ` ${token} ` : ` ${token}`),
    phrase: ` ${normalized} `,
    barcode: /^\d+$/.test(normalized) ? normalized : "",
  };
}
