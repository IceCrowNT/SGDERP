/** Search labels without changing the stored/displayed Vietnamese text. */
export function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").trim();
}

export function matchesSearchText(text: string, query: string) {
  const normalized = normalizeSearchText(text);
  return normalizeSearchText(query).split(/\s+/).filter(Boolean).every(word => normalized.includes(word));
}
