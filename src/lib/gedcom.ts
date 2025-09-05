import type { Person, Tree } from "./db";

// Super minimal GEDCOM import/export (INDI + basic facts)
export function exportGedcom(tree: Tree) {
  const lines: string[] = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR GenesisGates");
  lines.push("1 CHAR UTF-8");
  for (const p of Object.values(tree.people)) {
    lines.push(`0 @${p.id}@ INDI`);
    if (p.name) lines.push(`1 NAME ${p.name}`);
    if (p.sex) lines.push(`1 SEX ${p.sex}`);
    if (p.birthDate || p.birthPlace) {
      lines.push(`1 BIRT`);
      if (p.birthDate) lines.push(`2 DATE ${p.birthDate}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }
    if (p.deathDate || p.deathPlace) {
      lines.push(`1 DEAT`);
      if (p.deathDate) lines.push(`2 DATE ${p.deathDate}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }
  }
  lines.push("0 TRLR");
  return lines.join("\n");
}

export function importGedcom(text: string): Person[] {
  // Parse only a tiny subset (NAME/SEX/BIRT/DEAT with DATE/PLAC)
  const persons: Person[] = [];
  let cur: Person | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\s+(?:@([^@]+)@\s+)?([A-Z]+)(?:\s+(.*))?$/);
    if (!m) continue;
    const [, lvl, xref, tag, rest] = m;

    if (lvl === "0" && tag === "INDI") {
      if (cur) persons.push(cur);
      cur = { id: xref || `p_${Math.random().toString(36).slice(2,8)}`, name: "", spouseIds: [], parentIds: [], childIds: [] };
    } else if (cur) {
      if (lvl === "1" && tag === "NAME") cur.name = rest || cur.name || "";
      if (lvl === "1" && tag === "SEX") cur.sex = (rest as any) === "M" ? "M" : (rest as any) === "F" ? "F" : undefined;
      if (lvl === "1" && (tag === "BIRT" || tag === "DEAT")) {
        // look ahead for nested lines
        // (we don't implement a full tokeniser; this is a minimal importer)
      }
      if (lvl === "2" && tag === "DATE") {
        if (!cur.deathDate && !cur.birthDate) cur.birthDate = rest;
        else cur.deathDate = rest;
      }
      if (lvl === "2" && tag === "PLAC") {
        if (!cur.deathPlace && !cur.birthPlace) cur.birthPlace = rest;
        else cur.deathPlace = rest;
      }
    }
  }
  if (cur) persons.push(cur);
  return persons;
}
