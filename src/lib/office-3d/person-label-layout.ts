/** Screen-space labels only; never changes the position of a person or desk. */
export type LabelBox = { key: string; x: number; y: number; w: number; h: number; priority?: number };
const GAP = 8;
const MAX_SHIFT = 80;
export function labelsOverlap(a: LabelBox, b: LabelBox) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + GAP - .1 &&
    Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP - .1;
}
export function layoutPersonLabels(input: LabelBox[], width: number, height: number, obstacles: LabelBox[] = []) {
  const boxes = input.filter(b => b.w + 8 <= width && b.h + 8 <= height).map(b => ({
    ...b, originX: b.x, originY: b.y,
    minX: Math.max(b.w / 2 + 4, b.x - MAX_SHIFT),
    maxX: Math.min(width - b.w / 2 - 4, b.x + MAX_SHIFT),
  })).sort((a, b) => a.originX - b.originX || a.key.localeCompare(b.key));
  // Split the correction equally, transferring unused space at the viewport edge.
  // Fixed order and bounded passes avoid oscillating simulation / continuous rendering.
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const left = boxes[i], right = boxes[j];
      if (!labelsOverlap(left, right)) continue;
      const need = (left.w + right.w) / 2 + GAP - (right.x - left.x);
      const leftSpace = Math.max(0, left.x - left.minX), rightSpace = Math.max(0, right.maxX - right.x);
      let dl = Math.min(need / 2, leftSpace), dr = Math.min(need / 2, rightSpace);
      dl += Math.min(Math.max(0, need - dl - dr), leftSpace - dl);
      dr += Math.min(Math.max(0, need - dl - dr), rightSpace - dr);
      left.x -= dl; right.x += dr;
      changed ||= dl + dr > .1;
    }
    if (!changed) break;
  }
  const occupied = [...obstacles];
  const result: LabelBox[] = [];
  // Only crowded clusters need a second row. Selection wins if even that cannot fit.
  for (const box of boxes.slice().sort((a,b) => (b.priority ?? 0) - (a.priority ?? 0) || a.originX - b.originX || a.key.localeCompare(b.key))) {
    for (const dy of [0, -(box.h + GAP), box.h + GAP]) {
      const candidate = { ...box, y: box.originY + dy };
      if (candidate.y < box.h / 2 + 4 || candidate.y > height - box.h / 2 - 4) continue;
      if (occupied.some(other => labelsOverlap(candidate, other))) continue;
      occupied.push(candidate); result.push(candidate); break;
    }
  }
  return result;
}
