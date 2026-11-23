import { normalizeSearchText } from "./search-text";

// Aliases describe search vocabulary only; they never designate a department/person or grant access.
const itAliases = ["it", "cntt", "cong nghe thong tin", "information technology"];
const words = (s: string) => normalizeSearchText(s).replace(/[^a-z0-9]+/g, " ").trim();
function phrase(text: string, query: string) {
  return (` ${text} `).includes(` ${query} `);
}
function acronym(value: string) {
  return words(value).replace(/^(phong|ban|bo phan|trung tam)\s+/, "").split(/\s+/).map(w => w[0] ?? "").join("");
}
export function matchesSupportTarget(
  target: { name: string; code: string; position?: string; department?: string; departmentCode?: string; kind: "people" | "departments" },
  search: string,
) {
  const query = words(search);
  if (!query) return true;
  const fields = [target.name, target.code, target.position ?? "", target.department ?? "", target.departmentCode ?? ""].map(words);
  if (itAliases.includes(query)) return fields.some(f => itAliases.some(alias => phrase(f, alias)));
  // Derive abbreviations only from department names, never from a person's initials.
  const abbreviations = [acronym(target.department ?? ""), ...(target.kind === "departments" ? [acronym(target.name)] : [])];
  if (abbreviations.includes(query)) return true;
  return query.split(" ").every(term => fields.some(f => term.length <= 3 ? phrase(f, term) : f.includes(term)));
}
