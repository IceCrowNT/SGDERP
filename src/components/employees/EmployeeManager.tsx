"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Building2,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  List,
  Search,
  Pencil,
  X,
} from "lucide-react";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountCredentials } from "@/components/accounts/AccountCredentials";
import { usernameBase } from "@/lib/username";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createEmployee,
  updateEmployee,
  getEmployees,
} from "@/actions/employee";
import {
  CreateEmployeeSchema,
  EmployeeFieldsSchema,
  type CreateEmployeeInput,
} from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Employee = NonNullable<
  Awaited<ReturnType<typeof getEmployees>>["data"]
>[number];
type AccountOptions = {
  accountAccess: boolean;
  roles: Array<{ id: number; ten_vai_tro: string }>;
  accounts: Array<{
    id: number;
    employee_id: number | null;
    ten_dang_nhap: string;
    cho_phep_dang_nhap: boolean;
    danh_sach_vai_tro: Array<{ vai_tro: { ten_vai_tro: string } }>;
  }>;
};
type Department = {
  id: number;
  name: string;
  shortName: string;
  parentId: number | null;
};
const statuses = {
  ACTIVE: "Đang làm việc",
  LEFT: "Đã nghỉ việc",
  UNKNOWN: "Chưa xác nhận",
};
export function EmployeeManager({
  initialEmployees,
  departments,
  canManage,
  accountAccess,
  roles,
  accounts,
  initialDepartmentId,
  initialSearch = "",
}: {
  initialEmployees: Employee[];
  departments: Department[];
  canManage: boolean;
  initialDepartmentId?: number;
  initialSearch?: string;
} & AccountOptions) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("ALL");
  const [departmentId, setDepartmentId] = useState(
    initialSearch
      ? "ALL"
      : initialDepartmentId
        ? String(initialDepartmentId)
        : "ALL",
  );
  const [view, setView] = useState<"directory" | "table">("directory");
  const [showPeople, setShowPeople] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const selected = initialEmployees.find((e) => e.id === selectedId);
  const department = departments.find((d) => String(d.id) === departmentId);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLocaleLowerCase("vi")
      .trim();
  const query = normalize(search);
  const branchIds = (id: number) => {
    const ids = new Set([id]);
    for (const parentId of ids)
      for (const d of departments) if (d.parentId === parentId) ids.add(d.id);
    return ids;
  };
  const scope = department ? branchIds(department.id) : new Set<number>();
  const statusRows = initialEmployees.filter(
    (e) => status === "ALL" || e.tinh_trang_lam_viec === status,
  );
  const rows = statusRows.filter(
    (e) =>
      (departmentId === "ALL" ||
        (departmentId === "UNASSIGNED"
          ? !e.department_id
          : scope.has(e.department_id ?? -1))) &&
      normalize(
        `${e.ho_ten} ${e.ma_nhan_su} ${e.chuc_vu ?? ""} ${e.phong_ban?.ten_phong_ban ?? ""}`,
      ).includes(query),
  );
  const pageSize = view === "table" ? 15 : 12;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const overview =
    view === "directory" && departmentId === "ALL" && !query && !showPeople;
  const childDepartments = departments.filter((d) =>
    department
      ? d.parentId === department.id
      : !d.parentId || !departments.some((parent) => parent.id === d.parentId),
  );
  const headFor = (id: number) =>
    initialEmployees.find((e) =>
      e.danh_sach_phong_phu_trach.some((d) => d.id === id),
    );
  const chooseDepartment = (id: string) => {
    setDepartmentId(id);
    setSearch("");
    setShowPeople(id !== "ALL");
    setPage(1);
  };
  const openPerson = (id: number) => {
    detailTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelectedId(id);
  };
  const departmentCard = (d: Department) => {
    const ids = branchIds(d.id);
    const count = statusRows.filter((e) =>
      ids.has(e.department_id ?? -1),
    ).length;
    const head = headFor(d.id);
    return (
      <Button
        key={d.id}
        variant="outline"
        aria-label={`Xem phòng ${d.shortName}`}
        onClick={() => chooseDepartment(String(d.id))}
        className="group h-auto min-w-0 flex-col items-stretch justify-start gap-4 whitespace-normal rounded-2xl p-5 text-left shadow-none hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <ChevronRight
            className="mt-2 size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
        <span className="min-h-10 font-semibold leading-5">{d.shortName}</span>
        <span>
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            người{ids.size > 1 ? " trong nhánh" : " trực thuộc"}
          </span>
        </span>
        {ids.size > 1 && (
          <span className="-mt-3 text-xs text-muted-foreground">
            Gồm {ids.size - 1} đơn vị con
          </span>
        )}
        <span className="mt-auto border-t pt-3 text-xs text-muted-foreground">
          {head
            ? `Phụ trách: ${head.ho_ten}${head.tinh_trang_lam_viec !== "ACTIVE" ? " · cần xác nhận lại" : ""}`
            : "Chưa phân công người phụ trách"}
        </span>
      </Button>
    );
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="size-6 text-primary" aria-hidden="true" />
            Hồ sơ nhân sự
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialEmployees.length} hồ sơ ·{" "}
            {
              initialEmployees.filter((e) => e.tinh_trang_lam_viec === "ACTIVE")
                .length
            }{" "}
            đang làm việc theo hồ sơ
          </p>
        </div>
        {canManage && (
          <Button className="min-h-10" onClick={() => setEditing(null)}>
            <Plus aria-hidden="true" />
            Thêm nhân sự
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9 text-base"
              aria-label="Tìm nhân sự"
              placeholder="Tìm người trong toàn công ty…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDepartmentId("ALL");
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-10 w-full sm:w-52"
              aria-label="Tình trạng làm việc"
            >
              <SelectValue>
                {status === "ALL"
                  ? "Tất cả tình trạng"
                  : statuses[status as keyof typeof statuses]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả tình trạng</SelectItem>
              {Object.entries(statuses).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex gap-1 rounded-lg bg-muted p-1"
            role="group"
            aria-label="Cách xem nhân sự"
          >
            <Button
              className="min-h-10"
              variant={view === "directory" ? "outline" : "ghost"}
              aria-pressed={view === "directory"}
              onClick={() => {
                setView("directory");
                setPage(1);
              }}
            >
              <LayoutGrid aria-hidden="true" />
              Danh bạ
            </Button>
            <Button
              className="min-h-10"
              variant={view === "table" ? "outline" : "ghost"}
              aria-pressed={view === "table"}
              onClick={() => {
                setView("table");
                setPage(1);
              }}
            >
              <List aria-hidden="true" />
              Bảng
            </Button>
          </div>
          {view === "table" ? (
            <Select value={departmentId} onValueChange={chooseDepartment}>
              <SelectTrigger
                className="h-10 w-full min-w-0 sm:max-w-sm"
                aria-label="Lọc phòng ban"
              >
                <SelectValue>
                  {department?.name ??
                    (departmentId === "UNASSIGNED"
                      ? "Chưa gắn phòng ban"
                      : "Tất cả phòng ban")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
                <SelectItem value="UNASSIGNED">Chưa gắn phòng ban</SelectItem>
              </SelectContent>
            </Select>
          ) : overview ? (
            <Button
              className="min-h-10"
              variant="ghost"
              onClick={() => {
                setShowPeople(true);
                setPage(1);
              }}
            >
              Xem tất cả nhân sự
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button
              className="min-h-10"
              variant="ghost"
              onClick={() => chooseDepartment("ALL")}
            >
              <ArrowLeft aria-hidden="true" />
              Các phòng ban
            </Button>
          )}
        </div>
      </div>
      {overview ? (
        <section aria-label="Danh bạ phòng ban" className="space-y-4">
          <div>
            <h2 className="font-semibold">Chọn phòng ban</h2>
            <p className="text-sm text-muted-foreground">
              Mở một phòng để xem nhân sự và các bộ phận trực thuộc.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {childDepartments.map(departmentCard)}
            {initialEmployees.some((e) => !e.department_id) && (
              <Button
                variant="outline"
                onClick={() => chooseDepartment("UNASSIGNED")}
                className="h-auto min-h-40 flex-col gap-2 whitespace-normal rounded-2xl p-5"
              >
                <Users aria-hidden="true" />
                <span>Chưa gắn phòng ban</span>
                <span>
                  {statusRows.filter((e) => !e.department_id).length} người
                </span>
              </Button>
            )}
          </div>
          {!departments.length && !initialEmployees.length && (
            <EmptyPanel
              title="Chưa có dữ liệu nhân sự"
              description="Phòng ban và nhân sự sẽ xuất hiện tại đây khi được tạo."
            />
          )}
        </section>
      ) : (
        <section aria-label="Danh sách nhân sự" className="space-y-4">
          <div className="space-y-2">
            {department?.parentId && (
              <Button
                variant="ghost"
                className="min-h-10"
                onClick={() => chooseDepartment(String(department.parentId))}
              >
                <ArrowLeft aria-hidden="true" />
                Phòng ban cấp trên
              </Button>
            )}
            <h2 className="font-semibold">
              {query
                ? "Kết quả tìm kiếm toàn công ty"
                : (department?.shortName ??
                  (departmentId === "UNASSIGNED"
                    ? "Chưa gắn phòng ban"
                    : "Tất cả nhân sự"))}
            </h2>
            <p className="text-sm text-muted-foreground" role="status">
              {rows.length
                ? `Hiển thị ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, rows.length)} / ${rows.length} hồ sơ`
                : "0 hồ sơ"}
              {department && scope.size > 1 ? " · gồm các đơn vị con" : ""}
              {status !== "ALL"
                ? ` · ${statuses[status as keyof typeof statuses]}`
                : ""}
            </p>
            {department && (
              <p className="text-sm text-muted-foreground">
                {headFor(department.id)
                  ? `Người phụ trách: ${headFor(department.id)!.ho_ten}`
                  : "Chưa phân công người phụ trách"}
              </p>
            )}
          </div>
          {view === "directory" &&
            department &&
            childDepartments.length > 0 && (
              <div
                className="flex flex-wrap gap-2"
                aria-label="Bộ phận trực thuộc"
              >
                {childDepartments.map((d) => (
                  <Button
                    key={d.id}
                    variant="outline"
                    className="h-auto min-h-10 max-w-full whitespace-normal text-left"
                    onClick={() => chooseDepartment(String(d.id))}
                  >
                    <Building2 aria-hidden="true" />
                    {d.shortName}
                    <ChevronRight aria-hidden="true" />
                  </Button>
                ))}
              </div>
            )}
          {!rows.length ? (
            <EmptyPanel
              title="Không tìm thấy nhân sự."
              description="Thử tên, mã khác hoặc chọn lại bộ lọc tình trạng."
            />
          ) : view === "directory" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleRows.map((e) => (
                <Button
                  key={e.id}
                  variant="outline"
                  aria-label={`Xem hồ sơ ${e.ho_ten}`}
                  onClick={() => openPerson(e.id)}
                  className="h-auto min-w-0 items-start justify-start gap-3 whitespace-normal rounded-xl p-4 text-left shadow-none hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  <EmployeeAvatar employee={e} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block font-semibold">{e.ho_ten}</span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      {e.chuc_vu || "Chưa cập nhật chức vụ"}
                    </span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {e.phong_ban?.ten_phong_ban ?? "Chưa gắn phòng ban"}
                    </span>
                    {e.danh_sach_phong_phu_trach.some((d) =>
                      department
                        ? d.id === department.id
                        : d.id === e.department_id,
                    ) && <Badge variant="outline">Người phụ trách</Badge>}
                    {e.tinh_trang_lam_viec !== "ACTIVE" && (
                      <Badge variant="secondary">
                        {statuses[e.tinh_trang_lam_viec]}
                      </Badge>
                    )}
                  </span>
                  <ChevronRight
                    className="mt-2 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl md:border">
              <Table role="table" className="block md:table">
                <TableHeader className="sr-only md:not-sr-only md:table-header-group">
                  <TableRow>
                    <TableHead>Nhân sự</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Chức vụ</TableHead>
                    <TableHead>Tình trạng làm việc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  role="rowgroup"
                  className="grid gap-3 p-1 md:table-row-group md:p-0 [&_td]:block [&_td]:whitespace-normal md:[&_td]:table-cell"
                >
                  {visibleRows.map((e) => (
                    <TableRow
                      key={e.id}
                      role="row"
                      className="block cursor-pointer rounded-xl bg-card p-3 ring-1 ring-border md:table-row md:rounded-none md:p-0 md:ring-0"
                      onClick={() => openPerson(e.id)}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="h-auto max-w-full justify-start gap-2 whitespace-normal px-0 text-left hover:bg-transparent"
                          aria-label={`Xem hồ sơ ${e.ho_ten}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openPerson(e.id);
                          }}
                        >
                          <EmployeeAvatar employee={e} />
                          <span>
                            <span className="block font-medium">
                              {e.ho_ten}
                            </span>
                            <span className="block text-xs font-normal text-muted-foreground">
                              {e.ma_nhan_su}
                            </span>
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        {e.phong_ban?.ten_phong_ban ?? "Chưa gắn phòng ban"}
                      </TableCell>
                      <TableCell>{e.chuc_vu || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {statuses[e.tinh_trang_lam_viec]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {pageCount > 1 && (
            <nav
              className="flex items-center justify-center gap-3"
              aria-label="Phân trang nhân sự"
            >
              <Button
                variant="outline"
                className="min-h-10"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft aria-hidden="true" />
                Trước
              </Button>
              <span className="text-sm tabular-nums">
                Trang {currentPage} / {pageCount}
              </span>
              <Button
                variant="outline"
                className="min-h-10"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Sau
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </section>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          showCloseButton={false}
          className="w-full overflow-y-auto sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (editing === undefined)
              detailTrigger.current?.focus({ preventScroll: true });
          }}
        >
          {selected && (
            <>
              <SheetHeader className="border-b p-5 pr-16">
                <SheetTitle>Hồ sơ nhân sự</SheetTitle>
                <SheetDescription>{selected.ma_nhan_su}</SheetDescription>
              </SheetHeader>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="absolute right-3 top-3"
                  aria-label="Đóng hồ sơ"
                >
                  <X aria-hidden="true" />
                </Button>
              </SheetClose>
              <div className="space-y-6 px-5 pb-6">
                <div className="flex items-start gap-3">
                  <EmployeeAvatar employee={selected} />
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold break-words">
                      {selected.ho_ten}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.chuc_vu || "Chưa cập nhật chức vụ"}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {statuses[selected.tinh_trang_lam_viec]}
                    </Badge>
                  </div>
                </div>
                <dl className="grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2">
                  {[
                    ["Phòng ban", selected.phong_ban?.ten_phong_ban],
                    ["Điện thoại", selected.so_dien_thoai],
                    ["Email", selected.thu_dien_tu],
                    ["Địa chỉ", selected.dia_chi],
                    ["Ngày sinh", displayDate(selected.ngay_sinh)],
                    ["Ngày vào làm", displayDate(selected.ngay_vao_lam)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words">
                        {value || "Chưa cập nhật"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {selected.danh_sach_phong_phu_trach.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-sm font-semibold">
                      Phòng ban phụ trách
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selected.danh_sach_phong_phu_trach.map((d) => (
                        <Badge
                          className="whitespace-normal"
                          variant="outline"
                          key={d.id}
                        >
                          {d.ten_phong_ban}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}
                <section className="space-y-2 text-sm">
                  <h4 className="font-semibold">Ghi chú</h4>
                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                    {selected.ghi_chu || "Chưa có ghi chú."}
                  </p>
                </section>
                <section className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
                  <h4 className="font-semibold">Tài khoản liên kết</h4>
                  <p>
                    {selected._count.danh_sach_tai_khoan
                      ? `${selected._count.danh_sach_tai_khoan} tài khoản`
                      : "Chưa có tài khoản"}
                  </p>
                  {accountAccess &&
                    accounts
                      .filter((a) => a.employee_id === selected.id)
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"
                        >
                          <span className="break-all">{a.ten_dang_nhap}</span>
                          <Badge variant="outline">
                            {a.cho_phep_dang_nhap
                              ? "Được đăng nhập"
                              : "Đã khóa"}
                          </Badge>
                        </div>
                      ))}
                </section>
                {canManage && (
                  <Button
                    className="min-h-10 w-full"
                    onClick={() => {
                      setEditing(selected);
                      setSelectedId(null);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Sửa hồ sơ
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Cập nhật hồ sơ nhân sự" : "Thêm hồ sơ nhân sự"}
            </DialogTitle>
            <DialogDescription>
              Quản lý hồ sơ trực tiếp trong ERP. Mã nhân sự được cấp tự động và
              giữ nguyên. Chuyển sang đã nghỉ việc sẽ tự khóa tất cả tài khoản
              liên kết.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <EmployeeForm
              key={editing?.id ?? "new"}
              employee={editing}
              departments={departments}
              accountAccess={accountAccess}
              roles={roles}
              accounts={accounts}
              done={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function displayDate(value: Date | null) {
  return value
    ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "UTC" })
    : null;
}
function EmployeeAvatar({ employee }: { employee: Employee }) {
  return (
    <Avatar className="size-11" aria-hidden="true">
      <AvatarImage src={employee.duong_dan_anh_dai_dien ?? undefined} alt="" />
      <AvatarFallback className="bg-primary/10 text-primary">
        {employee.ho_ten
          .trim()
          .split(/\s+/)
          .slice(-2)
          .map((p) => p[0])
          .join("")}
      </AvatarFallback>
    </Avatar>
  );
}
function EmployeeForm({
  employee,
  departments,
  done,
  accountAccess,
  roles,
  accounts,
}: {
  employee: Employee | null;
  departments: Department[];
  done: () => void;
} & AccountOptions) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  }>();
  const [pending, start] = useTransition();
  const date = (v: Date | null | undefined) =>
    v ? new Date(v).toISOString().slice(0, 10) : "";
  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: {
      createAccount: !employee && accountAccess,
      accountUsername: "",
      accountPassword: "",
      accountRoleIds: [],
      fullName: employee?.ho_ten ?? "",
      position: employee?.chuc_vu ?? "",
      departmentId: employee?.department_id ?? undefined,
      notes: employee?.ghi_chu ?? "",
      phone: employee?.so_dien_thoai ?? "",
      email: employee?.thu_dien_tu ?? "",
      dateOfBirth: date(employee?.ngay_sinh),
      joinDate: date(employee?.ngay_vao_lam),
      employmentStatus: employee?.tinh_trang_lam_viec ?? "ACTIVE",
    },
  });
  const [createAccount, fullName, employmentStatus] = useWatch({
    control: form.control,
    name: ["createAccount", "fullName", "employmentStatus"],
  });
  const leaving = employmentStatus === "LEFT";
  const linkedAccounts = accounts.filter((a) => a.employee_id === employee?.id);
  const fields = [
    { name: "fullName", label: "Họ và tên" },
    { name: "position", label: "Chức vụ" },
    { name: "phone", label: "Điện thoại" },
    { name: "email", label: "Email" },
    { name: "dateOfBirth", label: "Ngày sinh", type: "date" },
    { name: "joinDate", label: "Ngày vào làm", type: "date" },
  ] as const;
  if (credentials)
    return <AccountCredentials credentials={credentials} done={done} />;
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        noValidate
        onSubmit={form.handleSubmit(
          (values) =>
            start(async () => {
              const r = employee
                ? await updateEmployee({ ...values, id: employee.id })
                : await createEmployee(values);
              if (!r.success) {
                if ("fieldErrors" in r && r.fieldErrors) {
                  let focusFirst = true;
                  for (const [key, messages] of Object.entries(r.fieldErrors)) {
                    if (key in EmployeeFieldsSchema.shape && messages?.[0]) {
                      form.setError(
                        key as keyof CreateEmployeeInput,
                        { type: "server", message: messages[0] },
                        { shouldFocus: focusFirst },
                      );
                      focusFirst = false;
                    }
                  }
                }
                toast.error(r.message);
                return;
              }
              toast.success(r.message);
              router.refresh();
              if (r.credentials) setCredentials(r.credentials);
              else done();
            }),
          () =>
            toast.error(
              "Vui lòng kiểm tra các trường được đánh dấu trong biểu mẫu.",
            ),
        )}
      >
        <FormRequiredHint />
        <div className="rounded-lg border p-3 text-sm">
          <p>
            Mã nhân sự:{" "}
            <span className="font-mono">
              {employee?.ma_nhan_su ?? "Tự cấp khi lưu"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Mã được giữ nguyên khi đổi tên hoặc chuyển phòng ban.
          </p>
        </div>
        {employee?.ngay_chot_nhan_su_hr && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer py-2">
              Nguồn nhập ban đầu
            </summary>
            <p>
              Danh sách HR ngày{" "}
              {new Date(employee.ngay_chot_nhan_su_hr).toLocaleDateString(
                "vi-VN",
                {
                  timeZone: "UTC",
                },
              )}
              . Hồ sơ hiện tại được cập nhật độc lập.
            </p>
            {employee.ghi_chu_nhan_su_hr && (
              <p>Ghi chú trong file gốc: {employee.ghi_chu_nhan_su_hr}</p>
            )}
          </details>
        )}
        <div
          className={accountAccess ? "grid gap-6 lg:grid-cols-2" : "space-y-4"}
        >
          <div className="min-w-0 space-y-4">
            <h3 className="font-semibold">Thông tin nhân sự</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required={f.name === "fullName"}>
                        {f.label}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          aria-required={f.name === "fullName" || undefined}
                          value={field.value ?? ""}
                          type={"type" in f ? f.type : "text"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Phòng ban</FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          aria-required="true"
                          className="h-10 w-full"
                        >
                          <SelectValue>
                            {departments.find((d) => d.id === field.value)
                              ?.name ?? "Chọn phòng ban"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Tình trạng làm việc</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "LEFT") {
                          form.setValue("createAccount", false);
                          form.setValue("accountUsername", "");
                          form.setValue("accountPassword", "");
                          form.setValue("accountRoleIds", []);
                          form.clearErrors([
                            "accountUsername",
                            "accountPassword",
                            "accountRoleIds",
                          ]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          aria-required="true"
                          className="h-10 w-full"
                        >
                          <SelectValue>{statuses[field.value]}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(statuses).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      maxLength={5000}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {leaving && (
              <p
                role="status"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                Khi lưu, tất cả tài khoản của nhân sự này sẽ bị khóa và các
                phiên đăng nhập bị thu hồi. Chuyển lại đang làm việc không tự mở
                tài khoản.
              </p>
            )}
          </div>
          {accountAccess && (
            <div className="min-w-0 space-y-4 rounded-xl border p-4">
              <h3 className="font-semibold">Tài khoản đăng nhập</h3>
              {linkedAccounts.length > 0 && (
                <ul className="space-y-2" aria-label="Tài khoản liên kết">
                  {linkedAccounts.map((a) => (
                    <li
                      className="rounded-lg bg-muted/40 p-3 text-sm"
                      key={a.id}
                    >
                      <p className="break-all font-medium">
                        {a.ten_dang_nhap} ·{" "}
                        {a.cho_phep_dang_nhap
                          ? "Cho phép đăng nhập"
                          : "Đã khóa"}
                      </p>
                      <p className="text-muted-foreground">
                        {a.danh_sach_vai_tro
                          .map((r) => r.vai_tro.ten_vai_tro)
                          .join(", ") || "Chưa gán vai trò"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {employee && (
                <Button asChild variant="outline">
                  <Link href="/accounts">Quản lý tài khoản và quyền</Link>
                </Button>
              )}
              {leaving ? (
                <p className="text-sm text-muted-foreground">
                  Không cấp tài khoản mới cho nhân sự đã nghỉ việc.
                </p>
              ) : (
                <>
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(createAccount)}
                      disabled={pending}
                      onCheckedChange={(v) => {
                        form.setValue("createAccount", v === true);
                        if (!v) {
                          form.setValue("accountUsername", "");
                          form.setValue("accountPassword", "");
                          form.setValue("accountRoleIds", []);
                        }
                      }}
                    />
                    Tạo tài khoản đăng nhập
                  </label>
                  {createAccount && (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Tên đăng nhập dự kiến:{" "}
                        <strong className="font-mono">
                          {usernameBase(fullName || "")}
                        </strong>
                        . Nếu trùng sẽ tự thêm số khi lưu.
                      </p>
                      <p className="text-sm">
                        Quyền cơ bản: <strong>DEFAULT</strong> · Dashboard, hồ
                        sơ cá nhân và đổi mật khẩu. Mật khẩu tạm được cấp sau
                        khi lưu.
                      </p>
                      <details>
                        <summary className="cursor-pointer py-2 text-sm">
                          Tùy chọn nâng cao
                        </summary>
                        {(
                          [
                            {
                              name: "accountUsername",
                              label: "Tên đăng nhập mới",
                              type: "text",
                            },
                            {
                              name: "accountPassword",
                              label: "Mật khẩu khởi tạo",
                              type: "password",
                            },
                          ] as const
                        ).map((f) => (
                          <FormField
                            key={f.name}
                            control={form.control}
                            name={f.name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{f.label}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    type={f.type}
                                    autoComplete="off"
                                    placeholder="Để trống để tự cấp"
                                    disabled={pending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                        <FormField
                          control={form.control}
                          name="accountRoleIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vai trò tài khoản mới</FormLabel>
                              <div
                                role="group"
                                aria-label="Vai trò tài khoản mới"
                              >
                                {roles.map((r) => (
                                  <label
                                    key={r.id}
                                    className="flex min-h-10 items-center gap-2 text-sm"
                                  >
                                    <Checkbox
                                      disabled={pending}
                                      checked={
                                        field.value?.includes(r.id) ?? false
                                      }
                                      onCheckedChange={(checked) =>
                                        field.onChange(
                                          checked
                                            ? [...(field.value ?? []), r.id]
                                            : (field.value ?? []).filter(
                                                (id) => id !== r.id,
                                              ),
                                        )
                                      }
                                    />
                                    {r.ten_vai_tro}
                                  </label>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </details>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <Button type="submit" disabled={pending || !form.formState.isReady}>
          {pending ? "Đang lưu…" : "Lưu hồ sơ"}
        </Button>
      </form>
    </Form>
  );
}
