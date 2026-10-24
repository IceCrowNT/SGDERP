"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize, ChevronRight, ChevronDown } from "lucide-react";
import type { DepartmentItem } from "./DepartmentManager";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Node = { id: number; x: number; y: number; department?: DepartmentItem };

export function OrganizationChart({ departments, companyName, search }: {
  departments: DepartmentItem[]; companyName: string; search: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(0.8);
  const [selected, setSelected] = useState<DepartmentItem | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const graph = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Array<[Node, Node]> = [];
    const visited = new Set<number>();
    let leaf = 0;
    const walk = (department: DepartmentItem, depth: number): Node | null => {
      if (visited.has(department.id)) return null;
      visited.add(department.id);
      const children = collapsed.has(department.id) ? [] : departments.filter(d => d.parentId === department.id);
      const descendants = children.map(child => walk(child, depth + 1)).filter((n): n is Node => n !== null);
      const x = descendants.length ? (descendants[0].x + descendants[descendants.length - 1].x) / 2 : 24 + leaf++ * 330;
      const node = { id: department.id, department, x, y: 24 + depth * 170 };
      nodes.push(node);
      descendants.forEach(child => edges.push([node, child]));
      return node;
    };
    const roots = departments.filter(d => d.parentId === null || !departments.some(p => p.id === d.parentId));
    const rootNodes = roots.map(d => walk(d, 1)).filter((n): n is Node => n !== null);
    const company = { id: -1, x: rootNodes.length ? (rootNodes[0].x + rootNodes[rootNodes.length - 1].x) / 2 : 24, y: 24 };
    nodes.push(company);
    rootNodes.forEach(child => edges.push([company, child]));
    return { nodes, edges, width: Math.max(...nodes.map(n => n.x)) + 320, height: Math.max(...nodes.map(n => n.y)) + 124 };
  }, [departments, collapsed]);
  useEffect(() => {
    const container = viewport.current;
    const company = graph.nodes.find(node => !node.department);
    if (container && company) {
      container.scrollLeft = Math.max(0, (company.x + 146) * scale - container.clientWidth / 2);
    }
  }, [graph, scale]);
  const query = search.trim().toLocaleLowerCase("vi");
  const matches = departments.filter(d => [d.name, d.code].some(v => v.toLocaleLowerCase("vi").includes(query)));
  const focusResult = () => {
    setCollapsed(new Set());
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = viewport.current?.querySelector(`[data-department-id="${matches[0]?.id}"]`);
      el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }));
  };
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" className="size-10" aria-label="Thu nhỏ sơ đồ" onClick={() => setScale(s => Math.max(.2, s - .1))}><Minus className="size-4" /></Button>
      <span className="w-12 text-center text-sm" aria-live="polite">{Math.round(scale * 100)}%</span>
      <Button variant="outline" size="icon" className="size-10" aria-label="Phóng to sơ đồ" onClick={() => setScale(s => Math.min(1.5, s + .1))}><Plus className="size-4" /></Button>
      <Button variant="outline" className="h-10" onClick={() => {
        if (viewport.current) { setScale(Math.min(1, viewport.current.clientWidth / graph.width, viewport.current.clientHeight / graph.height)); viewport.current.scrollTo(0, 0); }
      }}><Maximize className="size-4" />Vừa màn hình</Button>
      <Button variant="ghost" className="h-10" onClick={() => { setCollapsed(new Set()); setScale(.8); }}>Mở tất cả</Button>
      {query && <Button variant="outline" disabled={!matches.length} onClick={focusResult}>Tới kết quả ({matches.length})</Button>}
    </div>
    <div ref={viewport} role="region" aria-label="Sơ đồ cơ cấu tổ chức" tabIndex={0}
      className="h-[65vh] min-h-80 w-full overflow-auto rounded-xl border bg-muted/20 cursor-grab active:cursor-grabbing"
      onPointerDown={e => {
        if (e.pointerType !== "mouse" || e.button !== 0 || (e.target as Element).closest("button")) return;
        drag.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => { if (drag.current) { e.currentTarget.scrollLeft = drag.current.left - e.clientX + drag.current.x; e.currentTarget.scrollTop = drag.current.top - e.clientY + drag.current.y; } }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <svg width={graph.width * scale} height={graph.height * scale} viewBox={`0 0 ${graph.width} ${graph.height}`} className="block max-w-none">
        {graph.edges.map(([parent, child]) => <path key={`${parent.id}-${child.id}`} d={`M ${parent.x + 146} ${parent.y + 90} V ${parent.y + 130} H ${child.x + 146} V ${child.y}`} fill="none" className="stroke-border" strokeWidth={2} />)}
        {graph.nodes.map(node => {
          const d = node.department;
          const hasChildren = d && departments.some(child => child.parentId === d.id);
          const highlighted = d && query && matches.some(m => m.id === d.id);
          return <foreignObject key={node.id} x={node.x} y={node.y} width={292} height={100} data-department-id={d?.id}>
            <div className={`flex h-[90px] items-center rounded-xl border border-t-4 bg-card shadow-sm ${highlighted ? "border-primary ring-2 ring-primary/30" : "border-border border-t-primary/70"}`}>
              {d ? <>
                <Button variant="ghost" className="h-full min-w-0 flex-1 flex-col items-start gap-1 whitespace-normal px-3 text-left" onClick={() => setSelected(d)} aria-label={`Xem nhân sự ${d.name}`}>
                  <span className="line-clamp-2 text-sm font-semibold">{d.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{d.code} · {d.employees.length} hồ sơ trực thuộc</span>
                </Button>
                {hasChildren && <Button variant="ghost" size="icon" className="size-10 shrink-0" aria-label={`${collapsed.has(d.id) ? "Mở" : "Thu"} nhánh ${d.name}`} aria-expanded={!collapsed.has(d.id)} onClick={() => setCollapsed(previous => {
                  const next = new Set(previous); if (next.has(d.id)) next.delete(d.id); else next.add(d.id); return next;
                })}>{collapsed.has(d.id) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}</Button>}
              </> : <p className="px-4 text-sm font-semibold">{companyName}</p>}
            </div>
          </foreignObject>;
        })}
      </svg>
    </div>
    <p className="text-xs text-muted-foreground">Kéo nền hoặc cuộn để di chuyển; bấm đơn vị để xem nhân sự. Đường nối thể hiện cơ cấu trong DB, không phải vị trí ngồi hay tuyến phê duyệt.</p>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>{selected?.employees.length ?? 0} hồ sơ trực thuộc; không bao gồm bộ phận con.</DialogDescription></DialogHeader>
        {selected?.employees.length ? <ul className="space-y-2">{selected.employees.map(person => <li key={person.id} className="rounded-lg border p-3"><p className="font-medium">{person.fullName}</p><p className="text-sm text-muted-foreground">{person.employeeCode} · {person.position || "Chưa có chức vụ"}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Chưa có hồ sơ nhân sự trực thuộc.</p>}
      </DialogContent>
    </Dialog>
  </div>;
}
