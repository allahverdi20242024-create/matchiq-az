export function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
    .replaceAll("ı", "i").replaceAll("ø", "o").replaceAll("ł", "l")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
