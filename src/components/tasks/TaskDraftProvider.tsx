"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
type Store = {
  values: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
};
const TaskDraftContext = createContext<Store | null>(null);
/** Account-scoped, memory-only drafts. No file bytes, credentials or browser storage. */
export function TaskDraftProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const set = useCallback(
    (key: string, value: unknown) =>
      setValues((previous) => {
        if (value === undefined) {
          if (!(key in previous)) return previous;
          const next = { ...previous };
          delete next[key];
          return next;
        }
        if (JSON.stringify(previous[key]) === JSON.stringify(value))
          return previous;
        return { ...previous, [key]: value };
      }),
    [],
  );
  const dirty = Object.keys(values).length > 0;
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  const store = useMemo(() => ({ values, set }), [values, set]);
  return (
    <TaskDraftContext.Provider value={store}>
      {children}
    </TaskDraftContext.Provider>
  );
}
export function useTaskDraft<T>(key: string) {
  const store = useContext(TaskDraftContext);
  if (!store) throw Error("Task drafts require the signed-in workspace.");
  const write = store.set;
  const set = useCallback(
    (value: T | undefined) => write(key, value),
    [key, write],
  );
  return [store.values[key] as T | undefined, set] as const;
}
