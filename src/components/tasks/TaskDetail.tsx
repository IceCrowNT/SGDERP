"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  getSupportTask,
  getTaskOptions,
  mutateSupportTask,
  uploadTaskFile,
} from "@/actions/support-task";
import {
  TASK_STATUS,
  TASK_EVENTS,
  TaskMutationSchema,
} from "@/lib/support-task";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Choice } from "./TaskCreate";
import { TaskEditForm, type TaskEditValues } from "./TaskEditForm";
import { useTaskDraft } from "./TaskDraftProvider";

type Data = Extract<
  Awaited<ReturnType<typeof getSupportTask>>,
  { success: true }
>;
type Options = Extract<
  Awaited<ReturnType<typeof getTaskOptions>>,
  { success: true }
>;
type Failure = {
  message: string;
  code?: string;
  reference?: string | null;
  recovery?: string;
};
type Operation = { payload: string; id: string; version: number };
type PendingUpload = {
  uploadId: string;
  version: number;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sha256: string;
};
type DetailDraft = {
  reason: string;
  evidence: number[];
  acceptance: string;
  assignee: string;
  reviewer: string;
  manager: string;
  side: string;
  edit: boolean;
  actionForm: string | null;
  editValues: TaskEditValues | null;
  editVersion: number | null;
  operation: Operation | null;
  actionError?: Failure | null;
  pendingUpload?: PendingUpload | null;
  fileError?: Failure | null;
};
type UploadBatch = {
  files: File[];
  index: number;
  version: number;
  recovery?: PendingUpload;
};
const operationPendingFailure: Failure = {
  message:
    "Kết quả lần gửi trước chưa được xác nhận. Kiểm tra lần gửi trước khi sửa tiếp.",
  code: "UNKNOWN_RESULT",
  recovery: "retry",
};
const uploadPendingFailure = (receipt: PendingUpload): Failure => ({
  message: `Kết quả tải tệp ${receipt.name} chưa được xác nhận. Chọn lại đúng tệp để kiểm tra lần tải trước.`,
  code: "UNKNOWN_RESULT",
  recovery: "retry",
});
const date = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(d))
    : "—";
const reasonLabels: Record<string, string> = {
  TU_CHOI_YEU_CAU: "Lý do từ chối",
  TU_CHOI_CA_NHAN: "Lý do không thể nhận việc",
  YEU_CAU_BO_SUNG: "Nội dung cần bổ sung",
  CHUYEN_DICH: "Ghi chú giao việc",
  BAN_GIAO: "Lý do bàn giao",
  DOI_NGUOI_NGHIEM_THU: "Lý do đổi người nghiệm thu",
  DOI_QUAN_LY: "Lý do bàn giao quản lý",
  HUY: "Lý do hủy việc",
};
const submitLabels: Record<string, string> = {
  TU_CHOI_YEU_CAU: "Từ chối yêu cầu",
  TU_CHOI_CA_NHAN: "Xác nhận không thể nhận",
  YEU_CAU_BO_SUNG: "Gửi yêu cầu bổ sung",
  CHUYEN_DICH: "Giao việc",
  BAN_GIAO: "Bàn giao công việc",
  DOI_NGUOI_NGHIEM_THU: "Lưu người nghiệm thu",
  DOI_QUAN_LY: "Lưu quản lý thay thế",
  HUY: "Xác nhận hủy",
};
const changeLabels: Record<string, string> = {
  tieu_de: "Tiêu đề",
  noi_dung: "Nội dung",
  trang_thai: "Trạng thái",
  bat_dau_luc: "Bắt đầu",
  han_hoan_thanh: "Hạn hoàn thành",
  bao_xong_luc: "Báo xong",
  nghiem_thu_luc: "Nghiệm thu",
  dong_luc: "Đóng việc",
  nhan_luc: "Nhận việc",
  nguoi_duoc_yeu_cau_id: "Người được giao",
  nguoi_thuc_hien_id: "Người thực hiện",
  nguoi_nghiem_thu_id: "Người nghiệm thu",
  quan_ly_nguoi_yeu_cau_id: "Quản lý người yêu cầu",
  quan_ly_ben_ho_tro_id: "Quản lý bên hỗ trợ",
  phong_ho_tro_id: "Phòng hỗ trợ",
};
function FailureNotice({
  failure,
  children,
}: {
  failure: Failure;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-md border border-destructive/30 p-3 text-sm">
      <p role="alert" className="text-destructive">
        {failure.message}
      </p>
      {failure.reference && (
        <p className="text-xs text-muted-foreground">
          Mã hỗ trợ: {failure.reference}
        </p>
      )}
      {children}
    </div>
  );
}
export function TaskDetail({
  id,
  returnHref = "/tasks",
  standalone = false,
  embedded = false,
  onLeaveGuard,
}: {
  id: number;
  returnHref?: string;
  standalone?: boolean;
  embedded?: boolean;
  onLeaveGuard?: (guard: () => boolean) => void;
}) {
  const [cached, cache] = useTaskDraft<DetailDraft>(`detail:${id}`);
  const [data, setData] = useState<Data | null>(null),
    [options, setOptions] = useState<Options | null>(null),
    [loadError, setLoadError] = useState<Failure | null>(null),
    [optionsError, setOptionsError] = useState<Failure | null>(null),
    [actionError, setActionError] = useState<Failure | null>(
      cached?.actionError ??
        (cached?.operation ? operationPendingFailure : null),
    ),
    [fileError, setFileError] = useState<Failure | null>(
      cached?.fileError ?? null,
    ),
    [pending, start] = useTransition(),
    [activity, setActivity] = useState(""),
    [needsRefresh, setNeedsRefresh] = useState(false),
    [historyPage, setHistoryPage] = useState(1),
    [reason, setReason] = useState(cached?.reason ?? ""),
    [evidence, setEvidence] = useState<number[]>(cached?.evidence ?? []),
    [acceptance, setAcceptance] = useState(cached?.acceptance ?? "KHONG_CAN"),
    [assignee, setAssignee] = useState(cached?.assignee ?? ""),
    [reviewer, setReviewer] = useState(cached?.reviewer ?? ""),
    [manager, setManager] = useState(cached?.manager ?? ""),
    [side, setSide] = useState(cached?.side ?? "SUPPORT"),
    [edit, setEdit] = useState(cached?.edit ?? false),
    [editDirty, setEditDirty] = useState(false),
    [actionForm, setActionForm] = useState<string | null>(
      cached?.actionForm === "BAO_XONG" ? null : (cached?.actionForm ?? null),
    ),
    [editValues, setEditValues] = useState<TaskEditValues | null>(
      cached?.editValues ?? null,
    ),
    [editVersion, setEditVersion] = useState<number | null>(
      cached?.editVersion ?? null,
    ),
    [operation, setOperation] = useState<Operation | null>(
      cached?.operation ?? null,
    ),
    [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(
      cached?.pendingUpload ?? null,
    ),
    [hasUploadBatch, setHasUploadBatch] = useState(false),
    [actionInstance, setActionInstance] = useState(0),
    [conflictReviewed, setConflictReviewed] = useState(false),
    [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const uploads = useRef(new Map<File, PendingUpload>()),
    fileInput = useRef<HTMLInputElement>(null),
    draftSnapshot = useRef<DetailDraft | null>(cached ?? null),
    uploadBatch = useRef<UploadBatch | null>(null),
    scroller = useRef<HTMLDivElement>(null),
    actionFailure = useRef<HTMLDivElement>(null);
  const dirty =
    editDirty ||
    Boolean(editValues) ||
    Boolean(operation) ||
    Boolean(pendingUpload) ||
    Boolean(reason.trim()) ||
    evidence.length > 0 ||
    Boolean(assignee || reviewer || manager) ||
    acceptance !== "KHONG_CAN";
  const canLeave = useCallback(() => {
    if (pending) {
      toast.info("Đang xử lý công việc. Vui lòng chờ kết quả.");
      return false;
    }
    return true;
  }, [pending]);
  useEffect(() => {
    const snapshot: DetailDraft = {
      reason,
      evidence,
      acceptance,
      assignee,
      reviewer,
      manager,
      side,
      edit,
      actionForm,
      editValues,
      editVersion,
      operation,
      actionError: actionError ?? (operation ? operationPendingFailure : null),
      pendingUpload,
      fileError:
        fileError ??
        (pendingUpload ? uploadPendingFailure(pendingUpload) : null),
    };
    draftSnapshot.current = snapshot;
    cache(dirty ? snapshot : undefined);
  }, [
    cache,
    dirty,
    reason,
    evidence,
    acceptance,
    assignee,
    reviewer,
    manager,
    side,
    edit,
    actionForm,
    editValues,
    editVersion,
    operation,
    actionError,
    pendingUpload,
    fileError,
  ]);
  useEffect(() => {
    onLeaveGuard?.(canLeave);
    return () => onLeaveGuard?.(() => true);
  }, [canLeave, onLeaveGuard]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.pathname.startsWith("/media/") ||
        anchor.href === location.href
      )
        return;
      if (!canLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, pending, canLeave]);
  useEffect(() => {
    let active = true;
    Promise.all([getSupportTask(id, historyPage), getTaskOptions()])
      .then(([r, o]) => {
        if (!active) return;
        if (r.success) {
          setData(r);
          setLoadError(null);
          setNeedsRefresh(false);
        } else {
          setLoadError(r);
          if (r.code === "FORBIDDEN" || r.code === "UNAUTHENTICATED")
            setData(null);
        }
        if (o.success) {
          setOptions(o);
          setOptionsError(null);
        } else setOptionsError(o);
      })
      .catch(() => {
        if (active)
          setLoadError({
            message: "Chưa tải được công việc. Hãy thử lại.",
            code: "LOAD_FAILED",
            recovery: "retry",
          });
      });
    return () => {
      active = false;
    };
  }, [id, historyPage]);
  useEffect(() => {
    if (actionError && actionError.code !== "VALIDATION")
      actionFailure.current?.focus({ preventScroll: true });
  }, [actionError]);
  useEffect(() => {
    if (actionForm)
      document
        .getElementById(`task-action-${id}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [actionForm, id]);
  const updateActionDraft = useCallback((values: ActionValues) => {
    setReason(values.reason);
    setAssignee(values.assignee === null ? "" : String(values.assignee));
    setReviewer(values.reviewer === null ? "" : String(values.reviewer));
    setManager(values.manager === null ? "" : String(values.manager));
    setSide(values.side);
  }, []);
  async function reload() {
    try {
      const [r, o] = await Promise.all([
        getSupportTask(id, historyPage),
        getTaskOptions(),
      ]);
      if (r.success) {
        setData(r);
        setLoadError(null);
        setNeedsRefresh(false);
      } else {
        setLoadError(r);
        if (r.code === "FORBIDDEN" || r.code === "UNAUTHENTICATED")
          setData(null);
      }
      if (o.success) {
        setOptions(o);
        setOptionsError(null);
      } else setOptionsError(o);
      return r.success;
    } catch {
      setLoadError({
        message: "Chưa tải được công việc. Hãy thử lại.",
        code: "LOAD_FAILED",
        recovery: "retry",
      });
      return false;
    }
  }
  function refresh() {
    start(async () => {
      setActivity("Đang tải…");
      await reload();
      setActivity("");
    });
  }
  function clearDraft() {
    draftSnapshot.current = null;
    setActionInstance((value) => value + 1);
    setOperation(null);
    setEditValues(null);
    setEditVersion(null);
    setReason("");
    setEvidence([]);
    setEdit(false);
    setEditDirty(false);
    setActionForm(null);
    setAssignee("");
    setReviewer("");
    setManager("");
    setAcceptance("KHONG_CAN");
    setActionError(null);
    setConflictReviewed(false);
    cache(undefined);
  }
  function sendOperation(nextOperation: Operation) {
    const body = JSON.parse(nextOperation.payload) as {
      id: number;
      action: string;
      addAcceptance?: string;
    };
    const snapshot: DetailDraft = {
      reason,
      evidence,
      acceptance,
      assignee,
      reviewer,
      manager,
      side,
      edit,
      actionForm,
      editValues,
      editVersion,
      pendingUpload,
      fileError,
      ...draftSnapshot.current,
      operation: nextOperation,
      actionError: operationPendingFailure,
    };
    draftSnapshot.current = snapshot;
    cache(snapshot);
    start(async () => {
      setActivity("Đang lưu…");
      setActionError(null);
      setConflictReviewed(false);
      try {
        const r = await mutateSupportTask({
          ...body,
          version: nextOperation.version,
          operationId: nextOperation.id,
        });
        if (!r.success) {
          setActionError(r);
          await reload();
          return;
        }
        clearDraft();
        setNeedsRefresh(true);
        const messages: Record<string, string> = {
          NHAN: "Đã nhận việc",
          BAO_XONG:
            data?.task.che_do_nghiem_thu !== "KHONG_CAN" ||
            (body.addAcceptance && body.addAcceptance !== "KHONG_CAN")
              ? "Đã gửi nghiệm thu"
              : "Đã hoàn thành công việc",
          NGHIEM_THU: "Đã nghiệm thu và hoàn thành công việc",
          YEU_CAU_BO_SUNG: "Đã yêu cầu bổ sung",
          CHUYEN_DICH: "Đã giao việc cho nhân viên",
          BAN_GIAO: "Đã bàn giao, chờ người mới nhận việc",
          TU_CHOI_CA_NHAN:
            "Đã ghi nhận không thể hỗ trợ; yêu cầu vẫn chờ phòng phân công",
          TU_CHOI_YEU_CAU: "Đã từ chối yêu cầu",
          HUY: "Đã hủy công việc",
          SUA: "Đã lưu thay đổi",
          DOI_NGUOI_NGHIEM_THU: "Đã đổi người nghiệm thu",
          DOI_QUAN_LY: "Đã bàn giao quản lý",
        };
        toast.success(messages[body.action] ?? "Đã lưu thay đổi");
        await reload();
      } catch {
        setActionError({
          message:
            "Chưa xác nhận được kết quả. Thử lại để kiểm tra; phần đang nhập vẫn được giữ.",
          code: "UNKNOWN_RESULT",
          recovery: "retry",
        });
      } finally {
        setActivity("");
      }
    });
  }
  function act(action: string, extra: object = {}) {
    if (!data || pending || needsRefresh) return;
    const immediate = action === "NHAN" || action === "NGHIEM_THU";
    const body = { id, action, reason: immediate ? "" : reason, ...extra },
      payload = JSON.stringify(body);
    const nextOperation =
      operation?.payload === payload
        ? operation
        : {
            payload,
            id: crypto.randomUUID(),
            version:
              action === "SUA"
                ? (editVersion ?? data.task.version)
                : data.task.version,
          };
    setOperation(nextOperation);
    sendOperation(nextOperation);
  }
  function runUpload(batch: UploadBatch) {
    start(async () => {
      setActivity("Đang tải tệp…");
      setFileError(null);
      try {
        for (; batch.index < batch.files.length; batch.index++) {
          const file = batch.files[batch.index];
          let receipt = uploads.current.get(file);
          if (!receipt) {
            const sha256 = Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
              ),
            )
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
            const recovering = batch.index === 0 ? batch.recovery : undefined;
            if (
              recovering &&
              (recovering.name !== file.name ||
                recovering.size !== file.size ||
                recovering.type !== file.type ||
                recovering.lastModified !== file.lastModified ||
                recovering.sha256 !== sha256)
            ) {
              setFileError({
                message: `Chọn lại đúng tệp ${recovering.name} đã gửi để kiểm tra kết quả.`,
                code: "UNKNOWN_RESULT",
                recovery: "retry",
              });
              uploadBatch.current = null;
              setHasUploadBatch(false);
              return;
            }
            receipt = recovering ?? {
              uploadId: crypto.randomUUID(),
              version: batch.version,
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              sha256,
            };
            uploads.current.set(file, receipt);
          }
          const snapshot: DetailDraft = {
            reason,
            evidence,
            acceptance,
            assignee,
            reviewer,
            manager,
            side,
            edit,
            actionForm,
            editValues,
            editVersion,
            operation,
            actionError,
            ...draftSnapshot.current,
            pendingUpload: receipt,
            fileError: uploadPendingFailure(receipt),
          };
          draftSnapshot.current = snapshot;
          cache(snapshot);
          setPendingUpload(receipt);
          const form = new FormData();
          form.set("id", String(id));
          form.set("version", String(receipt.version));
          form.set("uploadId", receipt.uploadId);
          form.set("file", file);
          const r = await uploadTaskFile(form);
          if (!r.success) {
            setFileError({ ...r, message: `${file.name}: ${r.message}` });
            if (r.recovery !== "retry") setPendingUpload(null);
            await reload();
            return;
          }
          const previousVersion = receipt.version;
          setEditVersion((base) =>
            base === previousVersion && r.version === previousVersion + 1
              ? r.version
              : base,
          );
          batch.version = r.version;
          if (draftSnapshot.current) {
            const previous = draftSnapshot.current;
            draftSnapshot.current = {
              ...previous,
              pendingUpload: null,
              fileError: null,
              editVersion:
                previous.editVersion === previousVersion &&
                r.version === previousVersion + 1
                  ? r.version
                  : previous.editVersion,
              evidence: data?.buttons.work
                ? [...new Set([...previous.evidence, r.fileId])]
                : previous.evidence,
            };
            cache(draftSnapshot.current);
          }
          setPendingUpload(null);
          uploads.current.delete(file);
          if (data?.buttons.work)
            setEvidence((old) => [...new Set([...old, r.fileId])]);
        }
        uploadBatch.current = null;
        setHasUploadBatch(false);
        await reload();
      } catch {
        const remaining = batch.files.length - batch.index - 1;
        setFileError({
          message: `Chưa xác nhận được kết quả tải tệp ${batch.files[batch.index]?.name ?? ""}. Kiểm tra lại trước khi gửi công việc.${remaining > 0 ? ` Còn ${remaining} tệp chưa tải.` : ""}`,
          code: "UNKNOWN_RESULT",
          recovery: "retry",
        });
      } finally {
        setActivity("");
      }
    });
  }
  const title = (text: string) =>
    embedded ? (
      <>
        <SheetTitle className="min-w-0 break-words text-xl">{text}</SheetTitle>
        <SheetDescription className="sr-only">
          Nội dung và xử lý công việc
        </SheetDescription>
      </>
    ) : (
      <h1 className="min-w-0 break-words text-xl font-semibold">{text}</h1>
    );
  if (!data)
    return (
      <div className="space-y-3 pr-12 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10">
        {title(loadError ? "Chưa tải được công việc" : "Đang tải công việc")}
        {loadError ? (
          <FailureNotice failure={loadError} />
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
        {loadError?.recovery === "sign_in" ? (
          <Button variant="outline" asChild>
            <Link href="/login">Đăng nhập lại</Link>
          </Button>
        ) : loadError && loadError.recovery !== "none" ? (
          <Button variant="outline" onClick={refresh} disabled={pending}>
            Thử lại
          </Button>
        ) : null}
      </div>
    );
  const t = data.task,
    b = data.buttons,
    people = options?.people ?? [];
  const participantNames = new Map(
    people.map((person) => [person.id, person.name]),
  );
  for (const person of [
    t.nguoi_yeu_cau,
    t.nguoi_duoc_yeu_cau,
    t.nguoi_thuc_hien,
    t.nguoi_nghiem_thu,
    t.quan_ly_nguoi_yeu_cau,
    t.quan_ly_ben_ho_tro,
  ])
    if (person) participantNames.set(person.id, person.ho_ten);
  const effectiveAction = edit
    ? null
    : (actionForm ?? (b.assign && !b.receive ? "CHUYEN_DICH" : null));
  const allowed: Record<string, boolean> = {
    CHUYEN_DICH: b.assign,
    BAN_GIAO: b.handoff,
    TU_CHOI_YEU_CAU: b.receive || b.assign,
    TU_CHOI_CA_NHAN: b.personalDecline,
    YEU_CAU_BO_SUNG: b.accept,
    DOI_NGUOI_NGHIEM_THU: b.manage,
    DOI_QUAN_LY: b.manage,
    HUY: b.manage,
  };
  const actionAllowed = effectiveAction ? allowed[effectiveAction] : true;
  const completion = b.work && !edit && !effectiveAction;
  const editId = `task-edit-${id}`,
    actionId = `task-action-${id}`;
  function discard() {
    if (dirty && !window.confirm("Bỏ phần chỉnh sửa chưa gửi?")) return;
    clearDraft();
  }
  function showEdit() {
    if (dirty && !window.confirm("Bỏ phần đang nhập để sửa nội dung?")) return;
    clearDraft();
    setEditVersion(t.version);
    setEdit(true);
    scroller.current?.scrollTo({ top: 0 });
  }
  function openAction(action: string) {
    if (dirty && !window.confirm("Bỏ phần đang nhập để chuyển thao tác?"))
      return;
    clearDraft();
    setActionForm(action);
  }
  function submitAction(values: ActionValues) {
    if (!effectiveAction || !actionAllowed) return;
    if (
      effectiveAction === "HUY" &&
      !window.confirm("Hủy công việc này? Lịch sử và tệp sẽ được giữ.")
    )
      return;
    const extra =
      effectiveAction === "CHUYEN_DICH"
        ? { targetType: "CA_NHAN", targetId: values.assignee }
        : effectiveAction === "BAN_GIAO"
          ? { personId: values.assignee }
          : effectiveAction === "DOI_NGUOI_NGHIEM_THU"
            ? { personId: values.reviewer }
            : effectiveAction === "DOI_QUAN_LY"
              ? { personId: values.manager, managerSide: values.side }
              : {};
    act(effectiveAction, { reason: values.reason, ...extra });
  }
  const assignments = people.filter(
    (p) =>
      p.departmentId === t.phong_ho_tro_id &&
      p.canReceive &&
      p.id !== t.nguoi_nghiem_thu_id &&
      (effectiveAction !== "BAN_GIAO" || p.id !== t.nguoi_thuc_hien_id),
  );
  function value(key: string, v: unknown) {
    if (v == null) return "Chưa có";
    if (key === "trang_thai")
      return TASK_STATUS[v as keyof typeof TASK_STATUS] ?? String(v);
    if (key === "phong_ho_tro_id")
      return (
        options?.departments.find((d) => d.id === v)?.name ?? "Phòng đã lưu"
      );
    if (key.endsWith("_id"))
      return participantNames.get(Number(v)) ?? "Nhân sự đã lưu";
    if (key.endsWith("_luc") || key === "han_hoan_thanh")
      return date(String(v));
    return String(v);
  }
  const descriptionLong =
    t.noi_dung.length > 500 || t.noi_dung.split("\n").length > 6;
  const primaryLabel = edit
    ? b.edit
      ? "Lưu thay đổi"
      : null
    : effectiveAction
      ? actionAllowed
        ? submitLabels[effectiveAction]
        : null
      : b.receive
        ? "Nhận việc"
        : b.work
          ? t.che_do_nghiem_thu !== "KHONG_CAN" || acceptance !== "KHONG_CAN"
            ? "Gửi nghiệm thu"
            : "Báo xong"
          : b.accept
            ? "Nghiệm thu và đóng"
            : null;
  const conflict = actionError?.code === "CONFLICT";
  const operationRetry = Boolean(
    operation && actionError?.recovery === "retry",
  );
  const blocked =
    pending ||
    needsRefresh ||
    operationRetry ||
    Boolean(loadError) ||
    Boolean(optionsError) ||
    Boolean(pendingUpload) ||
    fileError?.recovery === "retry";
  const canUpload = completion || (b.edit && !effectiveAction);
  const uploadBlocked =
    pending ||
    needsRefresh ||
    operationRetry ||
    Boolean(loadError) ||
    Boolean(optionsError);
  const reviewers = people.filter(
    (p) =>
      p.canAccept &&
      p.id !== t.nguoi_thuc_hien_id &&
      p.id !== t.nguoi_duoc_yeu_cau_id &&
      [
        t.nguoi_yeu_cau_id,
        people.find((x) => x.id === t.nguoi_yeu_cau_id)?.managerId,
      ].includes(p.id),
  );
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10",
        standalone && "h-[calc(100dvh-8rem)] min-h-80",
      )}
    >
      <header className="shrink-0 space-y-3 border-b pb-3">
        {standalone && (
          <Link
            href={returnHref}
            className="inline-flex min-h-10 items-center text-sm text-primary hover:underline"
          >
            ← Quay lại danh sách
          </Link>
        )}
        <div
          className={cn(
            "flex items-start justify-between gap-2",
            embedded && "pr-12",
          )}
        >
          {title(t.tieu_de)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Thao tác khác"
                disabled={pending}
                className="min-h-10 min-w-10"
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-w-[calc(100vw-2rem)] [&_[role=menuitem]]:min-h-10"
            >
              {!standalone && (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/tasks/${id}?returnTo=${encodeURIComponent(returnHref)}`}
                  >
                    Mở trang chi tiết
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      new URL(`/tasks/${id}`, location.origin).href,
                    );
                    toast.success("Đã sao chép liên kết");
                  } catch {
                    toast.error(
                      "Chưa sao chép được liên kết. Hãy mở trang chi tiết và sao chép địa chỉ.",
                    );
                  }
                }}
              >
                Sao chép liên kết
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={refresh}>Tải lại</DropdownMenuItem>
              {(b.edit || b.handoff || b.personalDecline || b.manage) && (
                <DropdownMenuSeparator />
              )}
              {b.edit && !edit && (
                <DropdownMenuItem disabled={blocked} onSelect={showEdit}>
                  Sửa nội dung và thời gian
                </DropdownMenuItem>
              )}
              {b.assign && b.receive && (
                <DropdownMenuItem
                  disabled={blocked}
                  onSelect={() => openAction("CHUYEN_DICH")}
                >
                  Giao việc
                </DropdownMenuItem>
              )}
              {b.handoff && (
                <DropdownMenuItem
                  disabled={blocked}
                  onSelect={() => openAction("BAN_GIAO")}
                >
                  Bàn giao người thực hiện
                </DropdownMenuItem>
              )}
              {b.personalDecline && (
                <DropdownMenuItem
                  disabled={blocked}
                  onSelect={() => openAction("TU_CHOI_CA_NHAN")}
                >
                  Không thể nhận việc
                </DropdownMenuItem>
              )}
              {b.manage && (
                <>
                  {b.assign && (
                    <DropdownMenuItem
                      disabled={blocked}
                      onSelect={() => openAction("TU_CHOI_YEU_CAU")}
                    >
                      Phòng từ chối yêu cầu
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    disabled={blocked}
                    onSelect={() => openAction("DOI_NGUOI_NGHIEM_THU")}
                  >
                    Đổi người nghiệm thu
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={blocked}
                    onSelect={() => openAction("DOI_QUAN_LY")}
                  >
                    Bàn giao quản lý
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={blocked}
                    onSelect={() => openAction("HUY")}
                  >
                    Hủy công việc
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm">
          <span className="font-medium">{TASK_STATUS[t.trang_thai]}</span> ·{" "}
          {t.phong_ho_tro.ten_phong_ban}
          {t.muc_do === "KHAN" && (
            <span className="ml-2 rounded bg-destructive/10 px-2 py-1 font-medium text-destructive">
              Khẩn
            </span>
          )}
        </p>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-muted-foreground">Người yêu cầu: </dt>
            <dd className="inline break-words">{t.nguoi_yeu_cau.ho_ten}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Người xử lý: </dt>
            <dd className="inline break-words">
              {t.nguoi_thuc_hien?.ho_ten ??
                t.nguoi_duoc_yeu_cau?.ho_ten ??
                "Chờ quản lý giao"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="inline text-muted-foreground">Hạn hoàn thành: </dt>
            <dd className="inline">
              {t.han_hoan_thanh ? date(t.han_hoan_thanh) : "Không đặt hạn"}
            </dd>
          </div>
        </dl>
      </header>
      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain py-4 pr-1"
      >
        {loadError && (
          <FailureNotice failure={loadError}>
            <Button variant="outline" onClick={refresh} disabled={pending}>
              Thử lại
            </Button>
          </FailureNotice>
        )}
        {optionsError && (
          <FailureNotice failure={optionsError}>
            <Button variant="outline" onClick={refresh} disabled={pending}>
              Tải lại người và phòng
            </Button>
          </FailureNotice>
        )}
        {t.trang_thai === "CAN_BO_SUNG" && data.latestSupplement && (
          <section
            className="space-y-1 rounded-md border p-3"
            aria-label="Yêu cầu bổ sung"
          >
            <h2 className="text-sm font-semibold">Cần bổ sung</h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {data.latestSupplement.ly_do}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.latestSupplement.nhan_su_thao_tac?.ho_ten} ·{" "}
              {date(data.latestSupplement.created_at)}
            </p>
          </section>
        )}
        {edit ? (
          <TaskEditForm
            formId={editId}
            hideActions
            initial={
              editValues ?? {
                title: t.tieu_de,
                description: t.noi_dung,
                startAt: t.bat_dau_luc?.toISOString() ?? null,
                deadline: t.han_hoan_thanh?.toISOString() ?? null,
              }
            }
            pending={blocked || !b.edit}
            onSave={(v) => act("SUA", v)}
            onCancel={discard}
            onDirtyChange={setEditDirty}
            onValuesChange={setEditValues}
            restoredDirty={Boolean(editValues)}
          />
        ) : (
          <section className="space-y-2" aria-label="Nội dung yêu cầu">
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-sm",
                descriptionLong && !descriptionExpanded && "line-clamp-6",
              )}
            >
              {t.noi_dung}
            </p>
            {descriptionLong && (
              <Button
                variant="ghost"
                aria-expanded={descriptionExpanded}
                onClick={() => setDescriptionExpanded((v) => !v)}
              >
                {descriptionExpanded
                  ? "Thu gọn nội dung"
                  : "Xem toàn bộ nội dung"}
              </Button>
            )}
          </section>
        )}
        {conflictReviewed && edit && (
          <details className="rounded-lg border p-3" open>
            <summary className="min-h-10 cursor-pointer text-sm font-medium">
              Bản đang lưu
            </summary>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Tiêu đề</dt>
                <dd className="break-words">{t.tieu_de}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nội dung</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {t.noi_dung}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bắt đầu</dt>
                <dd>{date(t.bat_dau_luc)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hạn hoàn thành</dt>
                <dd>{date(t.han_hoan_thanh)}</dd>
              </div>
            </dl>
          </details>
        )}
        {effectiveAction && (
          <section className="space-y-2">
            {!actionAllowed && (
              <p role="alert" className="text-sm text-destructive">
                Thao tác này không còn khả dụng ở trạng thái hiện tại. Phần đang
                nhập vẫn được giữ.
              </p>
            )}
            <TaskActionForm
              key={`${effectiveAction}:${actionInstance}`}
              id={actionId}
              action={effectiveAction}
              initial={{
                reason,
                assignee: assignee ? Number(assignee) : null,
                reviewer: reviewer ? Number(reviewer) : null,
                manager: manager ? Number(manager) : null,
                side: side === "REQUESTER" ? "REQUESTER" : "SUPPORT",
              }}
              disabled={blocked || !actionAllowed}
              assignments={assignments}
              reviewers={reviewers}
              managers={people.filter((person) => person.canView)}
              onChange={updateActionDraft}
              onSubmit={submitAction}
            />
          </section>
        )}
        <section className="space-y-3" aria-label="Tệp và bằng chứng">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">
              Tệp và bằng chứng
              {data.files.length ? ` (${data.files.length})` : ""}
            </h2>
            {canUpload && (
              <Button
                variant="outline"
                disabled={uploadBlocked}
                onClick={() => fileInput.current?.click()}
              >
                {pendingUpload ? "Chọn lại tệp" : "Thêm tệp"}
              </Button>
            )}
          </div>
          {t.bao_xong_luc && (
            <p className="text-sm text-muted-foreground">
              Báo xong lúc {date(t.bao_xong_luc)}
            </p>
          )}
          {data.files.length ? (
            <ul className="space-y-2">
              {data.files.map((f) => {
                const selectable =
                  completion &&
                  f.loai_tep === "BANG_CHUNG" &&
                  !f.su_kien_bao_xong_id &&
                  f.mine;
                return (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    {selectable && (
                      <label className="flex min-h-10 min-w-10 items-center justify-center">
                        <Checkbox
                          checked={evidence.includes(f.id)}
                          disabled={blocked}
                          onCheckedChange={(checked) =>
                            setEvidence((old) =>
                              checked
                                ? [...new Set([...old, f.id])]
                                : old.filter((v) => v !== f.id),
                            )
                          }
                          aria-label={`Gửi bằng chứng ${f.ten_goc}`}
                        />
                      </label>
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/media/task-files/${f.id}`}
                        className="inline-flex min-h-10 items-center break-words text-primary underline"
                      >
                        {f.ten_goc}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {f.su_kien_bao_xong_id
                          ? "Đã gửi báo xong"
                          : f.loai_tep === "MO_TA"
                            ? "Tệp mô tả"
                            : selectable
                              ? evidence.includes(f.id)
                                ? "Sẽ gửi cùng lần báo xong này"
                                : "Không gửi trong lần này"
                              : "Chưa gửi báo xong"}
                      </p>
                    </div>
                    {f.mime_type.startsWith("image/") && (
                      <a
                        className="inline-flex min-h-10 items-center text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                        href={`/media/task-files/${f.id}?view=1`}
                      >
                        Xem ảnh
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có tệp đính kèm.
            </p>
          )}
          {canUpload && (
            <div className="space-y-2">
              <Label className="sr-only" htmlFor={`task-file-${id}`}>
                {b.work ? "Thêm bằng chứng" : "Thêm tệp mô tả"}
              </Label>
              <Input
                id={`task-file-${id}`}
                ref={fileInput}
                tabIndex={-1}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx"
                disabled={uploadBlocked}
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) return;
                  if (
                    files.length > 5 ||
                    files.some(
                      (file) => !file.size || file.size > 10 * 1024 * 1024,
                    )
                  ) {
                    setFileError({
                      message:
                        "Chọn tối đa 5 tệp, mỗi tệp từ 1 byte đến 10 MiB.",
                      code: pendingUpload ? "UNKNOWN_RESULT" : "VALIDATION",
                      recovery: pendingUpload ? "retry" : "none",
                    });
                    return;
                  }
                  if (pendingUpload && files.length !== 1) {
                    setFileError({
                      message: `Chọn lại riêng tệp ${pendingUpload.name} để kiểm tra lần tải trước.`,
                      code: "UNKNOWN_RESULT",
                      recovery: "retry",
                    });
                    return;
                  }
                  const batch: UploadBatch = {
                    files,
                    index: 0,
                    version: t.version,
                    recovery: pendingUpload ?? undefined,
                  };
                  uploadBatch.current = batch;
                  setHasUploadBatch(true);
                  runUpload(batch);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                Ảnh, PDF, Word, Excel · tối đa 5 tệp/lần, 10 MiB/tệp.
              </p>
            </div>
          )}
          {fileError && (
            <FailureNotice failure={fileError}>
              {fileError.recovery === "retry" && hasUploadBatch && (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    if (uploadBatch.current) runUpload(uploadBatch.current);
                  }}
                >
                  Thử tải lại
                </Button>
              )}
              {fileError.recovery === "retry" &&
                !hasUploadBatch &&
                pendingUpload && (
                  <p className="text-xs text-muted-foreground">
                    Chọn lại tệp {pendingUpload.name} để kiểm tra lần tải trước.
                    Nội dung công việc vẫn được giữ.
                  </p>
                )}
              {fileError.recovery === "reload" && (
                <Button variant="outline" disabled={pending} onClick={refresh}>
                  Kiểm tra tệp đã lưu
                </Button>
              )}
            </FailureNotice>
          )}
          {completion && (
            <fieldset disabled={blocked} className="space-y-2 border-t pt-3">
              {t.che_do_nghiem_thu === "KHONG_CAN" ? (
                <Choice
                  label="Nghiệm thu"
                  value={acceptance}
                  onChange={setAcceptance}
                  options={{
                    KHONG_CAN: "Không cần",
                    NGUOI_YEU_CAU: "Người yêu cầu nghiệm thu",
                    QUAN_LY: "Quản lý người yêu cầu nghiệm thu",
                  }}
                />
              ) : (
                <p className="text-sm">
                  Nghiệm thu:{" "}
                  <strong>
                    {t.nguoi_nghiem_thu?.ho_ten ?? "Người đã được chỉ định"}
                  </strong>
                </p>
              )}
            </fieldset>
          )}
          {!completion && t.nguoi_nghiem_thu && (
            <p className="text-sm">
              Người nghiệm thu: <strong>{t.nguoi_nghiem_thu.ho_ten}</strong>
            </p>
          )}
        </section>
        <details className="rounded-lg border">
          <summary className="min-h-10 cursor-pointer p-3 text-sm font-medium">
            Thông tin thêm
          </summary>
          <dl className="grid gap-3 px-3 pb-3 text-sm sm:grid-cols-2">
            {[
              ["Bắt đầu", date(t.bat_dau_luc)],
              ["Nhận việc", date(t.nhan_luc)],
              ["Báo xong", date(t.bao_xong_luc)],
              ["Nghiệm thu", date(t.nghiem_thu_luc)],
              ["Đóng việc", date(t.dong_luc)],
              [
                "Quản lý bên yêu cầu",
                t.quan_ly_nguoi_yeu_cau?.ho_ten ?? "Chưa xác định",
              ],
              [
                "Quản lý bên hỗ trợ",
                t.quan_ly_ben_ho_tro?.ho_ten ?? "Chưa xác định",
              ],
            ].map(([label, v]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
            {t.bao_xong_luc && (
              <div>
                <dt className="text-muted-foreground">
                  Từ bắt đầu đến báo xong
                </dt>
                <dd>
                  {(
                    (new Date(t.bao_xong_luc).getTime() -
                      new Date(t.bat_dau_luc).getTime()) /
                    3600000
                  ).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}{" "}
                  giờ
                </dd>
              </div>
            )}
          </dl>
        </details>
        <details className="rounded-lg border">
          <summary className="min-h-10 cursor-pointer p-3 text-sm font-medium">
            Lịch sử xử lý
          </summary>
          <div className="space-y-3 px-3 pb-3">
            <ol className="space-y-3">
              {data.history.map((event) => {
                const before = (event.du_lieu_truoc ?? {}) as Record<
                    string,
                    unknown
                  >,
                  after = (event.du_lieu_sau ?? {}) as Record<string, unknown>;
                return (
                  <li
                    key={event.id}
                    className="space-y-1 border-l-2 pl-3 text-sm"
                  >
                    <p className="font-medium">
                      {after.ban_giao === true
                        ? "Bàn giao công việc"
                        : TASK_EVENTS[event.hanh_dong]}
                      {event.lan_bao_xong ? ` · Lần ${event.lan_bao_xong}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {event.nhan_su_thao_tac.ho_ten} · {date(event.created_at)}
                    </p>
                    {event.ly_do && (
                      <p className="whitespace-pre-wrap break-words">
                        {event.ly_do}
                      </p>
                    )}
                    {event.hanh_dong !== "TAO" && (
                      <details>
                        <summary className="min-h-10 cursor-pointer py-2 text-muted-foreground">
                          Nội dung thay đổi
                        </summary>
                        <ul className="space-y-1 py-2">
                          {Object.entries(changeLabels)
                            .filter(
                              ([key]) =>
                                key in after &&
                                JSON.stringify(before[key]) !==
                                  JSON.stringify(after[key]),
                            )
                            .map(([key, label]) => (
                              <li
                                key={key}
                                className="whitespace-pre-wrap break-words"
                              >
                                {label}: {value(key, before[key])} →{" "}
                                {value(key, after[key])}
                              </li>
                            ))}
                          {event.hanh_dong === "THEM_TEP" && (
                            <li>
                              Thêm tệp:{" "}
                              {String(
                                (after.file as { name?: string })?.name ??
                                  "Tệp đính kèm",
                              )}
                            </li>
                          )}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
            {data.historyPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pending || historyPage === 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                >
                  Mới hơn
                </Button>
                <Button
                  variant="outline"
                  disabled={pending || historyPage >= data.historyPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Cũ hơn
                </Button>
              </div>
            )}
          </div>
        </details>
      </div>
      <footer
        className="shrink-0 space-y-3 border-t bg-background pt-3"
        aria-label="Thao tác công việc"
      >
        {actionError && (
          <div ref={actionFailure} tabIndex={-1} className="outline-none">
            <FailureNotice failure={actionError}>
              {operationRetry && (
                <p className="text-xs text-muted-foreground">
                  Kiểm tra kết quả lần gửi trước khi sửa tiếp. Thao tác này giữ
                  nguyên nội dung đã gửi.
                </p>
              )}
              {conflict && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        if (await reload()) {
                          setConflictReviewed(true);
                          scroller.current?.scrollTo({ top: 0 });
                        }
                      })
                    }
                  >
                    Xem cập nhật
                  </Button>
                  {conflictReviewed &&
                    operation &&
                    data.task.version > operation.version && (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Giữ phần đang nhập và dùng bản công việc hiện tại? Hãy kiểm tra người xử lý và trạng thái trước khi gửi lại.",
                            )
                          )
                            return;
                          setEditVersion(data.task.version);
                          setOperation(null);
                          setActionError(null);
                          setConflictReviewed(false);
                        }}
                      >
                        Dùng bản mới
                      </Button>
                    )}
                </div>
              )}
              {actionError.recovery === "sign_in" && (
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center text-primary underline"
                >
                  Đăng nhập lại
                </Link>
              )}
            </FailureNotice>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span role="status" className="text-xs text-muted-foreground">
            {pending
              ? activity || "Đang xử lý…"
              : dirty
                ? "Chưa gửi"
                : !primaryLabel
                  ? t.trang_thai === "CHO_NGHIEM_THU"
                    ? `Chờ ${t.nguoi_nghiem_thu?.ho_ten ?? "người được chỉ định"} nghiệm thu`
                    : t.trang_thai === "CHO_NHAN"
                      ? "Chờ nhận hoặc phân công"
                      : ""
                  : ""}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {(edit || actionForm) && (
              <Button
                variant="ghost"
                disabled={pending || operationRetry || Boolean(pendingUpload)}
                onClick={discard}
              >
                {edit ? "Bỏ chỉnh sửa" : "Bỏ thao tác"}
              </Button>
            )}
            {!edit && !effectiveAction && b.receive && (
              <Button
                variant="outline"
                disabled={blocked}
                onClick={() => openAction("TU_CHOI_YEU_CAU")}
              >
                Từ chối yêu cầu
              </Button>
            )}
            {!edit && !effectiveAction && b.accept && (
              <Button
                variant="outline"
                disabled={blocked}
                onClick={() => openAction("YEU_CAU_BO_SUNG")}
              >
                Yêu cầu bổ sung
              </Button>
            )}
            {operationRetry ? (
              <Button
                disabled={pending || needsRefresh}
                onClick={() => {
                  if (operation) sendOperation(operation);
                }}
              >
                Kiểm tra lần gửi
              </Button>
            ) : (
              primaryLabel && (
                <Button
                  type={edit || effectiveAction ? "submit" : "button"}
                  form={edit ? editId : effectiveAction ? actionId : undefined}
                  variant={
                    effectiveAction === "HUY" ? "destructive" : "default"
                  }
                  disabled={blocked || conflict || (edit && !b.edit)}
                  onClick={() => {
                    if (edit || effectiveAction) return;
                    if (b.receive) act("NHAN");
                    else if (b.work)
                      act("BAO_XONG", {
                        evidenceIds: evidence,
                        ...(t.che_do_nghiem_thu === "KHONG_CAN"
                          ? { addAcceptance: acceptance }
                          : {}),
                      });
                    else if (b.accept) act("NGHIEM_THU");
                  }}
                >
                  {pending ? activity || "Đang xử lý…" : primaryLabel}
                </Button>
              )
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

const actionFields = z.object({
  reason: TaskMutationSchema.shape.reason.removeDefault(),
  assignee: TaskMutationSchema.shape.targetId.unwrap().nullable(),
  reviewer: TaskMutationSchema.shape.personId.unwrap().nullable(),
  manager: TaskMutationSchema.shape.personId.unwrap().nullable(),
  side: TaskMutationSchema.shape.managerSide.unwrap(),
});
type ActionValues = z.infer<typeof actionFields>;
type ActionPerson = {
  id: number;
  name: string;
  code?: string;
  department?: string;
};
function TaskActionForm({
  id,
  action,
  initial,
  disabled,
  assignments,
  reviewers,
  managers,
  onChange,
  onSubmit,
}: {
  id: string;
  action: string;
  initial: ActionValues;
  disabled: boolean;
  assignments: ActionPerson[];
  reviewers: ActionPerson[];
  managers: ActionPerson[];
  onChange: (values: ActionValues) => void;
  onSubmit: (values: ActionValues) => void;
}) {
  const schema = actionFields.superRefine((value, ctx) => {
    const issue = (path: keyof ActionValues, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (!value.reason.trim())
      issue(
        "reason",
        `Nhập ${(reasonLabels[action] ?? "lý do").toLowerCase()}.`,
      );
    if (
      (action === "CHUYEN_DICH" || action === "BAN_GIAO") &&
      value.assignee === null
    )
      issue("assignee", "Chọn nhân viên được giao.");
    if (action === "DOI_NGUOI_NGHIEM_THU" && value.reviewer === null)
      issue("reviewer", "Chọn người nghiệm thu thay thế.");
    if (action === "DOI_QUAN_LY" && value.manager === null)
      issue("manager", "Chọn quản lý thay thế.");
  });
  const form = useForm<ActionValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control });
  useEffect(() => {
    onChange(form.getValues());
  }, [values, form, onChange]);
  function personField(
    name: "assignee" | "reviewer" | "manager",
    label: string,
    choices: ActionPerson[],
  ) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{label}</FormLabel>
            <FormControl>
              <SearchableSelect
                label={label}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value === null ? "" : String(field.value)}
                onValueChange={(value) =>
                  field.onChange(value ? Number(value) : null)
                }
                options={choices.map((person) => ({
                  value: String(person.id),
                  label: person.name,
                  description: person.department ?? person.code,
                }))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }
  return (
    <Form {...form}>
      <form
        id={id}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-lg border p-3"
      >
        <h2 className="font-medium">{submitLabels[action]}</h2>
        <FormRequiredHint />
        <fieldset disabled={disabled} className="space-y-3">
          {action === "TU_CHOI_CA_NHAN" && (
            <p className="text-sm text-muted-foreground">
              Yêu cầu vẫn chờ quản lý phân công.
            </p>
          )}
          {(action === "CHUYEN_DICH" || action === "BAN_GIAO") && (
            <>
              {personField("assignee", "Nhân viên được giao", assignments)}
              <p className="text-xs text-muted-foreground">
                {assignments.length
                  ? "Người được giao cần xác nhận nhận việc."
                  : "Chưa có nhân viên trong phòng đủ điều kiện nhận việc."}
              </p>
            </>
          )}
          {action === "DOI_NGUOI_NGHIEM_THU" && (
            <>
              {personField("reviewer", "Người nghiệm thu thay thế", reviewers)}
              <p className="text-xs text-muted-foreground">
                Người yêu cầu hoặc quản lý hiện hành có quyền nghiệm thu.
              </p>
            </>
          )}
          {action === "DOI_QUAN_LY" && (
            <>
              <FormField
                control={form.control}
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quản lý cần bàn giao</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          className="min-h-10 w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REQUESTER" className="min-h-10">
                          Bên yêu cầu
                        </SelectItem>
                        <SelectItem value="SUPPORT" className="min-h-10">
                          Bên hỗ trợ
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {personField("manager", "Quản lý thay thế", managers)}
            </>
          )}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{reasonLabels[action]}</FormLabel>
                <FormControl>
                  <Textarea {...field} maxLength={2000} className="text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
      </form>
    </Form>
  );
}
