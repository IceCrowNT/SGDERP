"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getSupportTask,
  getTaskOptions,
  mutateSupportTask,
  uploadTaskFile,
} from "@/actions/support-task";
import { TASK_STATUS, TASK_EVENTS } from "@/lib/support-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Choice } from "./TaskCreate";
type Data = Extract<
  Awaited<ReturnType<typeof getSupportTask>>,
  { success: true }
>;
type Options = Extract<
  Awaited<ReturnType<typeof getTaskOptions>>,
  { success: true }
>;
const date = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(d))
    : "—";
const local = (d: Date | null) => {
  if (!d) return "";
  const v = new Date(d);
  return new Date(v.getTime() - v.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function TaskDetail({ id }: { id: number }) {
  const [data, setData] = useState<Data | null>(null),
    [options, setOptions] = useState<Options | null>(null),
    [error, setError] = useState(""),
    [pending, start] = useTransition(),
    [historyPage, setHistoryPage] = useState(1),
    [reason, setReason] = useState(""),
    [evidence, setEvidence] = useState<number[]>([]),
    [acceptance, setAcceptance] = useState("KHONG_CAN"),
    [assignee, setAssignee] = useState(""),
    [reviewer, setReviewer] = useState(""),
    [manager, setManager] = useState(""),
    [side, setSide] = useState("SUPPORT"),
    [edit, setEdit] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [startAt, setStartAt] = useState(""),
    [deadline, setDeadline] = useState("");
  const operation = useRef<{ payload: string; id: string } | null>(null),
    uploads = useRef(new Map<File, string>());
  useEffect(() => {
    let active = true;
    Promise.all([getSupportTask(id, historyPage), getTaskOptions()])
      .then(([r, o]) => {
        if (!active) return;
        if (r.success) setData(r);
        else {
          setData(null);
          setError(r.message);
        }
        if (o.success) setOptions(o);
      })
      .catch(() => {
        if (active) setError("Chưa tải được công việc.");
      });
    return () => {
      active = false;
    };
  }, [id, historyPage]);
  async function reload() {
    const r = await getSupportTask(id, historyPage);
    if (r.success) setData(r);
    else {
      setData(null);
      setError(r.message);
    }
  }
  function act(action: string, extra: object = {}) {
    if (!data) return;
    const body = { id, action, reason, ...extra },
      payload = JSON.stringify(body);
    if (operation.current?.payload !== payload)
      operation.current = { payload, id: crypto.randomUUID() };
    const operationId = operation.current.id;
    start(async () => {
      setError("");
      try {
        const r = await mutateSupportTask({
          ...body,
          version: data.task.version,
          operationId,
        });
        if (!r.success) {
          setError(r.message);
          await reload();
          return;
        }
        operation.current = null;
        setReason("");
        setEvidence([]);
        setEdit(false);
        toast.success("Đã cập nhật công việc");
        await reload();
      } catch {
        setError("Chưa nhận được kết quả. Thử lại thao tác để kiểm tra.");
      }
    });
  }
  if (!data)
    return (
      <div className="space-y-3">
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
        <Button
          variant="outline"
          onClick={() => start(reload)}
          disabled={pending}
        >
          Tải lại
        </Button>
      </div>
    );
  const t = data.task,
    b = data.buttons;
  const eligibleFiles = data.files.filter(
    (f) => f.loai_tep === "BANG_CHUNG" && !f.su_kien_bao_xong_id && f.mine,
  );
  const people = options?.people ?? [];
  function showEdit() {
    setTitle(t.tieu_de);
    setDescription(t.noi_dung);
    setStartAt(local(t.bat_dau_luc));
    setDeadline(local(t.han_hoan_thanh));
    setEdit(true);
  }
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
  function value(k: string, v: unknown) {
    if (v == null) return "Chưa có";
    if (k === "trang_thai")
      return TASK_STATUS[v as keyof typeof TASK_STATUS] ?? String(v);
    if (k === "phong_ho_tro_id")
      return (
        options?.departments.find((d) => d.id === v)?.name ?? "Phòng đã lưu"
      );
    if (k.endsWith("_id"))
      return people.find((p) => p.id === v)?.name ?? "Nhân sự đã lưu";
    if (k.endsWith("_luc") || k === "han_hoan_thanh") return date(String(v));
    return String(v);
  }
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="break-words text-xl font-semibold">{t.tieu_de}</h2>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => start(reload)}
          >
            Tải lại
          </Button>
        </div>
        <p className="text-sm font-medium">
          {TASK_STATUS[t.trang_thai]} · {t.phong_ho_tro.ten_phong_ban}
        </p>
        <Link
          href={`/tasks/${id}`}
          className="text-sm text-primary hover:underline"
        >
          Mở trang riêng / lấy liên kết
        </Link>
      </header>
      <p className="whitespace-pre-wrap break-words text-sm">{t.noi_dung}</p>
      <dl className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
        {[
          ["Người yêu cầu", t.nguoi_yeu_cau.ho_ten],
          [
            "Người xử lý",
            t.nguoi_thuc_hien?.ho_ten ??
              t.nguoi_duoc_yeu_cau?.ho_ten ??
              "Chờ quản lý giao",
          ],
          ["Người nghiệm thu", t.nguoi_nghiem_thu?.ho_ten ?? "Không cần"],
          ["Bắt đầu", date(t.bat_dau_luc)],
          [
            "Hạn hoàn thành",
            t.han_hoan_thanh ? date(t.han_hoan_thanh) : "Không đặt hạn",
          ],
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
        ].map(([l, v]) => (
          <div key={l}>
            <dt className="text-muted-foreground">{l}</dt>
            <dd className="break-words font-medium">{v}</dd>
          </div>
        ))}
        {t.bao_xong_luc && (
          <div>
            <dt className="text-muted-foreground">
              Thời gian từ bắt đầu tới báo xong
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
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <section className="space-y-3">
        <h3 className="font-semibold">Tệp và bằng chứng</h3>
        <ul className="space-y-2">
          {data.files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm"
            >
              <a
                href={`/media/task-files/${f.id}`}
                className="min-w-0 flex-1 break-words text-primary underline"
              >
                {f.ten_goc}
              </a>
              <span className="text-muted-foreground">
                {f.su_kien_bao_xong_id
                  ? "Đã gửi báo xong"
                  : f.loai_tep === "MO_TA"
                    ? "Mô tả"
                    : "Chưa gửi báo xong"}
              </span>
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
          ))}
        </ul>
        {!data.files.length && (
          <p className="text-sm text-muted-foreground">Chưa có tệp.</p>
        )}
        {(b.work || b.edit) && (
          <div className="space-y-2">
            <Label htmlFor={`task-file-${id}`}>
              Thêm {b.work ? "bằng chứng" : "tệp mô tả"} (tối đa 5 tệp/lần, 10
              MiB/tệp)
            </Label>
            <Input
              id={`task-file-${id}`}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx"
              disabled={pending}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                if (
                  files.length > 5 ||
                  files.some((f) => !f.size || f.size > 10 * 1024 * 1024)
                ) {
                  setError("Chọn tối đa 5 tệp, mỗi tệp từ 1 byte đến 10 MiB.");
                  return;
                }
                start(async () => {
                  setError("");
                  let version = t.version;
                  try {
                    for (const file of files) {
                      let uploadId = uploads.current.get(file);
                      if (!uploadId) {
                        uploadId = crypto.randomUUID();
                        uploads.current.set(file, uploadId);
                      }
                      const form = new FormData();
                      form.set("id", String(id));
                      form.set("version", String(version));
                      form.set("uploadId", uploadId);
                      form.set("file", file);
                      const r = await uploadTaskFile(form);
                      if (!r.success) {
                        setError(r.message);
                        break;
                      }
                      version = r.version;
                      if (b.work)
                        setEvidence((old) => [...new Set([...old, r.fileId])]);
                    }
                    await reload();
                  } catch {
                    setError(
                      "Tải tệp bị gián đoạn. Tải lại công việc để kiểm tra tệp đã lưu.",
                    );
                  }
                });
              }}
              className="min-h-10 text-base"
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, PDF, Word hoặc Excel; tổng tối đa 50 MiB/công việc.
            </p>
          </div>
        )}
      </section>
      {(b.receive ||
        b.personalDecline ||
        b.work ||
        b.accept ||
        b.manage ||
        b.edit) && (
        <section className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">Xử lý công việc</h3>
          <fieldset disabled={pending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`task-reason-${id}`}>
                Ghi chú / lý do (bắt buộc khi từ chối, trả lại, giao hoặc hủy)
              </Label>
              <Textarea
                id={`task-reason-${id}`}
                value={reason}
                maxLength={2000}
                onChange={(e) => setReason(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {b.receive && (
                <>
                  <Button onClick={() => act("NHAN")}>
                    Xác nhận nhận việc
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => act("TU_CHOI_YEU_CAU")}
                  >
                    Từ chối yêu cầu
                  </Button>
                </>
              )}
              {b.personalDecline && (
                <Button
                  variant="outline"
                  onClick={() => act("TU_CHOI_CA_NHAN")}
                >
                  Tôi không thể hỗ trợ
                </Button>
              )}
              {b.accept && (
                <>
                  <Button onClick={() => act("NGHIEM_THU")}>
                    Nghiệm thu và đóng
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => act("YEU_CAU_BO_SUNG")}
                  >
                    Yêu cầu bổ sung
                  </Button>
                </>
              )}
              {b.edit && (
                <Button variant="outline" onClick={showEdit}>
                  Sửa nội dung / thời gian
                </Button>
              )}
            </div>
            {b.work && (
              <div className="space-y-3">
                {t.che_do_nghiem_thu === "KHONG_CAN" && (
                  <Choice
                    label="Nghiệm thu khi báo xong"
                    value={acceptance}
                    onChange={setAcceptance}
                    options={{
                      KHONG_CAN: "Không cần",
                      NGUOI_YEU_CAU: "Nhờ người yêu cầu nghiệm thu",
                      QUAN_LY: "Nhờ quản lý người yêu cầu nghiệm thu",
                    }}
                  />
                )}
                {eligibleFiles.map((f) => (
                  <label
                    key={f.id}
                    className="flex min-h-10 items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={evidence.includes(f.id)}
                      onCheckedChange={(v) =>
                        setEvidence((old) =>
                          v ? [...old, f.id] : old.filter((x) => x !== f.id),
                        )
                      }
                    />
                    {f.ten_goc}
                  </label>
                ))}
                <Button
                  onClick={() =>
                    act("BAO_XONG", {
                      evidenceIds: evidence,
                      ...(t.che_do_nghiem_thu === "KHONG_CAN"
                        ? { addAcceptance: acceptance }
                        : {}),
                    })
                  }
                >
                  Báo xong công việc
                </Button>
              </div>
            )}
            {b.assign && (
              <div className="space-y-3 border-t pt-3">
                <Label htmlFor="task-assignee">Nhân viên được giao</Label>
                <SearchableSelect
                  id="task-assignee"
                  label="Nhân viên được giao"
                  value={assignee}
                  onValueChange={setAssignee}
                  options={people
                    .filter((p) => p.departmentId === t.phong_ho_tro_id)
                    .map((p) => ({
                      value: String(p.id),
                      label: p.name,
                      description: p.code,
                    }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!assignee}
                    onClick={() =>
                      act("CHUYEN_DICH", {
                        targetType: "CA_NHAN",
                        targetId: Number(assignee),
                      })
                    }
                  >
                    Giao cho nhân viên
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => act("TU_CHOI_YEU_CAU")}
                  >
                    Phòng từ chối yêu cầu
                  </Button>
                </div>
              </div>
            )}
            {b.manage && (
              <details className="space-y-3 border-t pt-3">
                <summary className="cursor-pointer font-medium">
                  Điều phối / bàn giao
                </summary>
                <div className="space-y-3 pt-3">
                  <Label htmlFor="task-reviewer">Đổi người nghiệm thu</Label>
                  <SearchableSelect
                    id="task-reviewer"
                    label="Đổi người nghiệm thu"
                    value={reviewer}
                    onValueChange={setReviewer}
                    options={people.map((p) => ({
                      value: String(p.id),
                      label: p.name,
                      description: p.department,
                    }))}
                  />
                  <Button
                    variant="outline"
                    disabled={!reviewer}
                    onClick={() =>
                      act("DOI_NGUOI_NGHIEM_THU", {
                        personId: Number(reviewer),
                      })
                    }
                  >
                    Đổi người nghiệm thu
                  </Button>
                  <Choice
                    label="Quản lý cần bàn giao"
                    value={side}
                    onChange={setSide}
                    options={{
                      REQUESTER: "Bên yêu cầu",
                      SUPPORT: "Bên hỗ trợ",
                    }}
                  />
                  <Label htmlFor="task-manager">Quản lý thay thế</Label>
                  <SearchableSelect
                    id="task-manager"
                    label="Quản lý thay thế"
                    value={manager}
                    onValueChange={setManager}
                    options={people.map((p) => ({
                      value: String(p.id),
                      label: p.name,
                      description: p.department,
                    }))}
                  />
                  <Button
                    variant="outline"
                    disabled={!manager}
                    onClick={() =>
                      act("DOI_QUAN_LY", {
                        personId: Number(manager),
                        managerSide: side,
                      })
                    }
                  >
                    Bàn giao quản lý
                  </Button>
                  <div>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Hủy công việc này? Lịch sử và tệp sẽ được giữ.",
                          )
                        )
                          act("HUY");
                      }}
                    >
                      Hủy công việc
                    </Button>
                  </div>
                </div>
              </details>
            )}
          </fieldset>
          {pending && (
            <p role="status" className="text-sm text-muted-foreground">
              Đang lưu…
            </p>
          )}
        </section>
      )}
      {edit && b.edit && (
        <form
          className="space-y-3 rounded-xl border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            act("SUA", {
              title,
              description,
              startAt: startAt ? new Date(startAt).toISOString() : null,
              deadline: deadline ? new Date(deadline).toISOString() : null,
            });
          }}
        >
          <Label htmlFor="edit-task-title">Tiêu đề *</Label>
          <Input
            id="edit-task-title"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Label htmlFor="edit-task-desc">Nội dung *</Label>
          <Textarea
            id="edit-task-desc"
            required
            maxLength={20000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Label htmlFor="edit-task-start">Bắt đầu</Label>
          <Input
            id="edit-task-start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
          <Label htmlFor="edit-task-due">Hạn hoàn thành</Label>
          <Input
            id="edit-task-due"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Button disabled={pending}>Lưu thay đổi</Button>
        </form>
      )}
      <section className="space-y-3">
        <h3 className="font-semibold">Lịch sử xử lý</h3>
        <ol className="space-y-3">
          {data.history.map((e) => {
            const before = (e.du_lieu_truoc ?? {}) as Record<string, unknown>,
              after = (e.du_lieu_sau ?? {}) as Record<string, unknown>;
            return (
              <li key={e.id} className="space-y-1 border-l-2 pl-3 text-sm">
                <p className="font-medium">
                  {TASK_EVENTS[e.hanh_dong]}
                  {e.lan_bao_xong ? ` · Lần ${e.lan_bao_xong}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {e.nhan_su_thao_tac.ho_ten} · {date(e.created_at)}
                </p>
                {e.ly_do && (
                  <p className="whitespace-pre-wrap break-words">{e.ly_do}</p>
                )}
                {e.hanh_dong !== "TAO" && (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">
                      Nội dung thay đổi
                    </summary>
                    <ul className="space-y-1 py-2">
                      {Object.entries(changeLabels)
                        .filter(
                          ([k]) =>
                            k in after &&
                            JSON.stringify(before[k]) !==
                              JSON.stringify(after[k]),
                        )
                        .map(([k, l]) => (
                          <li
                            key={k}
                            className="whitespace-pre-wrap break-words"
                          >
                            {l}: {value(k, before[k])} → {value(k, after[k])}
                          </li>
                        ))}
                      {e.hanh_dong === "THEM_TEP" && (
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
              disabled={historyPage === 1}
              onClick={() => setHistoryPage((p) => p - 1)}
            >
              Lịch sử trước
            </Button>
            <Button
              variant="outline"
              disabled={historyPage >= data.historyPages}
              onClick={() => setHistoryPage((p) => p + 1)}
            >
              Lịch sử sau
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
