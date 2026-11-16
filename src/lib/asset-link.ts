/** Stable identity, independent of editable names/category codes. */
export function parseAssetId(value: string | null | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function assetPath(id: number): string {
  return `/assets?asset=${id}`;
}

/** Only canonical asset links may survive login/password-change redirects. */
export function assetReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || !/^\/assets\?asset=[1-9]\d*$/.test(value)) return null;
  const id = parseAssetId(value.slice("/assets?asset=".length));
  return id === null ? null : assetPath(id);
}
