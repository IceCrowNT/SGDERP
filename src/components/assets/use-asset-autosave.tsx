"use client";

import { useEffect, useRef, useState, type RefObject, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ASSET_AUTO_FIELDS = ["categoryId", "condition", "usage", "employeeId", "departmentId", "locationId"];
const CATEGORY_AUTO_FIELDS = ["active"];
export { CATEGORY_AUTO_FIELDS };
type SaveResult<R> = { success: true; row: R } | { success: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

/** Shared autosave lifecycle for existing asset records; creation remains explicit. */
export function useAssetAutosave<T extends FieldValues, U extends FieldValues, R>({
  form, root, save, valuesFromResult, onSaved, onCancel, onBlockedChange, onInvalid, enabled = true, ready = true, immediateFields = ASSET_AUTO_FIELDS,
}: {
  form: UseFormReturn<T, unknown, U>; root: RefObject<HTMLElement | null>;
  save: (values: U) => Promise<SaveResult<R>>; valuesFromResult: (row: R) => T;
  onSaved: (row: R) => void; onCancel: () => void; onBlockedChange?: (blocked: boolean) => void; onInvalid?: (fields: string[]) => void;
  enabled?: boolean; ready?: boolean; immediateFields?: string[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const waitingForChoices = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipBlur = useRef(false);
  const latest = useRef({ save, valuesFromResult, onSaved, onCancel, onInvalid, ready, enabled });
  useEffect(() => { latest.current = { save, valuesFromResult, onSaved, onCancel, onInvalid, ready, enabled }; });
  const dirty = form.formState.isDirty;
  const blocked = enabled && (dirty || pending || Boolean(error));
  useEffect(() => { onBlockedChange?.(blocked); }, [blocked, onBlockedChange]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  async function commit() {
    if (!latest.current.enabled || inFlight.current || !mounted.current) return;
    if (!latest.current.ready) { waitingForChoices.current = true; return; }
    waitingForChoices.current = false;
    // RHF resolves dirty state before this deferred commit; unchanged fields do not create audit entries.
    if (!form.formState.isDirty) {
      if (error) { form.clearErrors(); setError(""); setSaved(true); }
      return;
    }
    inFlight.current = true;
    setPending(true); setSaved(false); setError("");
    try {
      await form.handleSubmit(async values => {
        const result = await latest.current.save(values);
        if (!mounted.current) return;
        if (!result.success) {
          setError(result.message);
          latest.current.onInvalid?.(Object.keys(result.fieldErrors ?? {}));
          for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
            if (messages?.[0]) form.setError(field as Path<T>, { message: messages[0] });
          }
          return;
        }
        form.reset(latest.current.valuesFromResult(result.row));
        setSaved(true);
        toast.success("Đã lưu", { id: "asset-autosave" });
        latest.current.onSaved(result.row);
      }, errors => {
        setError("Chưa lưu. Kiểm tra thông tin được đánh dấu.");
        latest.current.onInvalid?.(Object.keys(errors));
        const first = Object.keys(errors)[0];
        if (first) setTimeout(() => { if (mounted.current) form.setFocus(first as Path<T>); }, 0);
      })();
    } catch {
      if (mounted.current) setError("Chưa lưu được do lỗi kết nối. Nội dung đang sửa vẫn được giữ; hãy thử lại.");
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }
  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; });
  function requestSave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void commitRef.current(); }, 0);
  }
  useEffect(() => {
    // A selection made while catalog data loads must still be saved once it is ready.
    if (enabled && ready && waitingForChoices.current) requestSave();
  }, [enabled, ready]);
  useEffect(() => {
    if (!enabled) return;
    const subscription = form.watch((_values, { name }) => {
      if (name && immediateFields.includes(name)) requestSave();
    });
    return () => subscription.unsubscribe();
  }, [enabled, form, immediateFields]);
  useEffect(() => {
    if (!enabled) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element) || root.current?.contains(event.target)) return;
      // Radix choices render in portals. Their onValueChange commits the complete selection.
      if (event.target.closest('[data-slot="popover-content"], [data-slot="select-content"]')) return;
      requestSave();
    };
    const unload = (event: BeforeUnloadEvent) => { if (blocked) event.preventDefault(); };
    const link = (event: MouseEvent) => {
      if (!blocked || !(event.target instanceof Element) || !event.target.closest("a[href]")) return;
      event.preventDefault(); event.stopPropagation(); requestSave();
      toast.info("Chờ lưu xong hoặc xử lý thông tin chưa lưu trước khi chuyển trang.");
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("click", link, true);
    window.addEventListener("beforeunload", unload);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("click", link, true); window.removeEventListener("beforeunload", unload); };
  }, [enabled, blocked, root]);
  function cancel() {
    if (inFlight.current) return;
    if (timer.current) clearTimeout(timer.current);
    waitingForChoices.current = false;
    form.reset(); setError(""); latest.current.onCancel();
  }
  const bindings = {
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (!enabled || skipBlur.current || event.relatedTarget instanceof Element && event.relatedTarget.closest("[data-autosave-cancel]")) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) requestSave();
    },
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => {
      skipBlur.current = event.target instanceof Element && Boolean(event.target.closest("[data-autosave-cancel]"));
      if (skipBlur.current && timer.current) clearTimeout(timer.current);
    },
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
      if (!enabled || event.nativeEvent.isComposing) return;
      const text = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === "Enter" && text && (event.target instanceof HTMLInputElement || event.ctrlKey || event.metaKey)) {
        event.preventDefault(); requestSave();
      }
      if (event.key === "Escape" && !document.querySelector('[data-slot="popover-content"], [data-slot="select-content"]')) {
        event.preventDefault(); event.stopPropagation(); cancel();
      }
    },
  };
  return { pending, error, saved, dirty, blocked, requestSave, cancel, bindings };
}

export function AssetAutosaveStatus({ auto }: { auto: { pending: boolean; error: string; saved: boolean; dirty: boolean; requestSave: () => void } }) {
  return <div className="space-y-2 text-sm">
    <p role="status" className="text-muted-foreground">{auto.pending ? "Đang lưu…" : auto.error ? "Chưa lưu" : auto.dirty ? "Chưa lưu · Rời ô để tự lưu" : auto.saved ? "Đã lưu" : "Tự lưu khi thay đổi"}</p>
    {auto.error && <div role="alert" className="space-y-2"><p className="text-destructive">{auto.error}</p><Button type="button" variant="outline" className="min-h-10" disabled={auto.pending} onClick={auto.requestSave}>Thử lưu lại</Button></div>}
  </div>;
}
