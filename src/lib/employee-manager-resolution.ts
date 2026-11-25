import type { Prisma } from "@prisma/client";

export type ManagerPerson = {
  id: number;
  department_id: number | null;
  quan_ly_truc_tiep_id: number | null;
  tinh_trang_lam_viec: string;
};
export type ManagerDepartment = {
  id: number;
  parent_id: number | null;
  nguoi_phu_trach_id: number | null;
  ten_phong_ban: string;
};
export type ManagerGraph = {
  people: ManagerPerson[];
  departments: ManagerDepartment[];
};
export type ManagerResolution = {
  managerId: number | null;
  source: "EXPLICIT" | "DEPARTMENT" | "ANCESTOR" | "TOP_LEVEL" | "UNRESOLVED";
  departmentId: number | null;
  error: string | null;
};
const unresolved = (error: string): ManagerResolution => ({
  managerId: null,
  source: "UNRESOLVED",
  departmentId: null,
  error,
});

/** Load only organization edges; callers keep their own business/account permission checks. */
export async function loadManagerGraph(
  tx: Prisma.TransactionClient,
  companyId: number,
): Promise<ManagerGraph> {
  const [people, departments] = await Promise.all([
    tx.nhan_su.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        department_id: true,
        quan_ly_truc_tiep_id: true,
        tinh_trang_lam_viec: true,
      },
    }),
    tx.phong_ban.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        parent_id: true,
        nguoi_phu_trach_id: true,
        ten_phong_ban: true,
      },
    }),
  ]);
  return { people, departments };
}

/** Batch resolution caches edges and cycle paths; no department head is copied into employee rows. */
export function createManagerResolver(graph: ManagerGraph) {
  const people = new Map(graph.people.map((p) => [p.id, p]));
  const departments = new Map(graph.departments.map((d) => [d.id, d]));
  const direct = new Map<number, ManagerResolution>();
  for (const p of people.values()) {
    let result: ManagerResolution;
    if (p.quan_ly_truc_tiep_id !== null) {
      result = {
        managerId: p.quan_ly_truc_tiep_id,
        source: "EXPLICIT",
        departmentId: null,
        error: null,
      };
    } else {
      const own =
        p.department_id === null ? null : departments.get(p.department_id);
      if (!own) result = unresolved("Nhân sự chưa được gắn phòng ban hợp lệ.");
      else if (own.nguoi_phu_trach_id === null)
        result = unresolved(
          `Phòng ${own.ten_phong_ban} chưa có người phụ trách.`,
        );
      else if (own.nguoi_phu_trach_id !== p.id)
        result = {
          managerId: own.nguoi_phu_trach_id,
          source: "DEPARTMENT",
          departmentId: own.id,
          error: null,
        };
      else if (own.parent_id === null)
        result = {
          managerId: null,
          source: "TOP_LEVEL",
          departmentId: own.id,
          error: null,
        };
      else {
        result = unresolved(
          "Chưa xác định quản lý cấp trên của người phụ trách phòng. Hãy chỉ định riêng hoặc cấu hình phòng cấp trên.",
        );
        const seen = new Set([own.id]);
        let current: number | null = own.parent_id;
        while (current !== null) {
          const parent = departments.get(current);
          if (!parent || seen.has(current)) {
            result = unresolved(
              "Cơ cấu phòng ban không hợp lệ. Hãy kiểm tra phòng cấp trên.",
            );
            break;
          }
          seen.add(current);
          if (
            parent.nguoi_phu_trach_id !== null &&
            parent.nguoi_phu_trach_id !== p.id
          ) {
            result = {
              managerId: parent.nguoi_phu_trach_id,
              source: "ANCESTOR",
              departmentId: parent.id,
              error: null,
            };
            break;
          }
          current = parent.parent_id;
        }
      }
    }
    direct.set(p.id, result);
  }

  // Detect cycles using all effective edges, including inactive people. Inactive status must not hide a cycle.
  const cyclicPath = new Map<number, boolean>(),
    cycles = new Set<string>();
  for (const start of people.keys()) {
    if (cyclicPath.has(start)) continue;
    const path: number[] = [],
      positions = new Map<number, number>();
    let current: number | null = start,
      cyclic = false;
    while (current !== null && people.has(current)) {
      if (cyclicPath.has(current)) {
        cyclic = cyclicPath.get(current)!;
        break;
      }
      if (positions.has(current)) {
        cyclic = true;
        const loop = path.slice(positions.get(current));
        cycles.add(
          loop
            .map((id) => `${id}>${direct.get(id)?.managerId}`)
            .sort()
            .join(","),
        );
        break;
      }
      positions.set(current, path.length);
      path.push(current);
      current = direct.get(current)?.managerId ?? null;
    }
    for (const id of path) cyclicPath.set(id, cyclic);
  }
  const resolved = new Map<number, ManagerResolution>();
  for (const [id, relation] of direct) {
    if (cyclicPath.get(id))
      resolved.set(
        id,
        unresolved(
          "Quan hệ quản lý có vòng lặp, gồm cả người phụ trách phòng. Hãy kiểm tra lại cơ cấu.",
        ),
      );
    else if (relation.managerId !== null && !people.has(relation.managerId))
      resolved.set(
        id,
        unresolved("Quản lý không thuộc danh sách nhân sự của công ty."),
      );
    else if (
      relation.managerId !== null &&
      people.get(relation.managerId)!.tinh_trang_lam_viec !== "ACTIVE"
    )
      resolved.set(
        id,
        unresolved(
          "Người quản lý không còn đang làm việc. Hãy cập nhật người phụ trách hoặc quản lý chỉ định riêng.",
        ),
      );
    else resolved.set(id, relation);
  }
  return {
    resolve: (personId: number): ManagerResolution =>
      resolved.get(personId) ??
      unresolved("Không tìm thấy nhân sự trong công ty."),
    cyclicPeople: new Set(
      [...cyclicPath].filter(([, bad]) => bad).map(([id]) => id),
    ),
    cycles,
    edgeOf: (personId: number) => direct.get(personId)?.managerId ?? null,
  };
}

/** Reject new cycles and new paths entering old cycles; unrelated legacy problems remain editable. */
export function assertNoNewManagerCycles(
  before: ManagerGraph,
  after: ManagerGraph,
) {
  const old = createManagerResolver(before),
    next = createManagerResolver(after);
  if (
    [...next.cycles].some((cycle) => !old.cycles.has(cycle)) ||
    [...next.cyclicPeople].some((id) =>
      !old.cyclicPeople.has(id) || next.edgeOf(id) !== old.edgeOf(id),
    )
  ) {
    throw Error(
      "Thay đổi này tạo vòng lặp quản lý, gồm cả người phụ trách phòng. Hãy chọn người quản lý hoặc cơ cấu khác.",
    );
  }
}
