export function usernameBase(name: string, employeeId?: number) {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const base = words.length
    ? words[words.length - 1] +
      words
        .slice(0, -1)
        .map((w) => w[0])
        .join("")
    : "";
  return base.length >= 3 ? base.slice(0, 80) : `nv${employeeId ?? ""}`;
}
