"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { matchesSearchText } from "@/lib/search-text";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
  disabled?: boolean;
};
type Props = Omit<React.ComponentProps<typeof Button>, "value" | "onChange" | "children"> & {
  label: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

/** A catalog selection: typing filters options; only choosing an option changes the value. */
export const SearchableSelect = forwardRef<HTMLButtonElement, Props>(function SearchableSelect({
  label, value, onValueChange, options, placeholder = "Chọn…",
  searchPlaceholder = "Gõ tên hoặc mã để tìm…", emptyMessage = "Không tìm thấy kết quả phù hợp.",
  className, disabled, onKeyDown, ...props
}, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const optionNodes = useRef(new Map<string, HTMLButtonElement>());
  const listId = useId();
  const selected = options.find(option => option.value === value);
  const filtered = useMemo(() => options.filter(option => matchesSearchText(`${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`, query)), [options, query]);
  const enabled = filtered.filter(option => !option.disabled);
  const activeValue = enabled.some(option => option.value === active) ? active : enabled[0]?.value;
  const activeIndex = filtered.findIndex(option => option.value === activeValue);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) { setQuery(""); setActive(value ?? null); }
  }
  function choose(option: SearchableOption) {
    if (disabled || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  }
  useEffect(() => {
    if (open && activeValue) optionNodes.current.get(activeValue)?.scrollIntoView({ block: "nearest" });
  }, [open, activeValue]);

  return <Popover open={open && !disabled} onOpenChange={changeOpen}>
    <PopoverTrigger asChild>
      <Button
        {...props}
        ref={ref}
        type="button"
        variant="outline"
        role="combobox"
        aria-label={props["aria-label"] ?? label}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        className={cn("h-auto min-h-10 w-full min-w-0 justify-between gap-2 px-3 py-2 text-left font-normal whitespace-normal", !selected && "text-muted-foreground", className)}
        onKeyDown={event => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); changeOpen(true); }
        }}
      >
        <span className="min-w-0"><span className="block break-words">{selected?.label ?? placeholder}</span>{selected?.description && <span className="mt-0.5 block break-words text-xs text-muted-foreground">{selected.description}</span>}</span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      aria-label={`Chọn ${label.toLocaleLowerCase("vi")}`}
      className="flex max-h-[min(24rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-1"
      onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}
      onEscapeKeyDown={event => event.stopPropagation()}
    >
      <div className="relative shrink-0 border-b p-2">
        <Search aria-hidden="true" className="absolute top-5 left-5 size-4 text-muted-foreground" />
        <Input
          ref={input}
          role="combobox"
          aria-label={`Tìm ${label.toLocaleLowerCase("vi")}`}
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder={searchPlaceholder}
          value={query}
          className="h-10 pl-9 text-base"
          onChange={event => { setQuery(event.target.value); setActive(null); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const index = enabled.findIndex(option => option.value === activeValue);
              const next = event.key === "ArrowDown" ? Math.min(index + 1, enabled.length - 1) : Math.max(index - 1, 0);
              setActive(enabled[next]?.value ?? null);
            } else if (event.key === "Enter") {
              event.preventDefault(); event.stopPropagation();
              const option = enabled.find(option => option.value === activeValue);
              if (option) choose(option);
            }
          }}
        />
      </div>
      <div id={listId} role="listbox" aria-label={label} className="min-h-0 overflow-y-auto overscroll-contain p-1">
        {filtered.map((option, index) => <Button
          key={option.value}
          ref={node => { if (node) optionNodes.current.set(option.value, node); else optionNodes.current.delete(option.value); }}
          id={`${listId}-${index}`}
          type="button"
          role="option"
          aria-label={option.label}
          aria-describedby={option.description ? `${listId}-${index}-description` : undefined}
          aria-selected={option.value === value}
          aria-disabled={option.disabled || undefined}
          disabled={option.disabled}
          tabIndex={-1}
          variant="ghost"
          className={cn("h-auto min-h-11 w-full justify-start gap-2 rounded-md px-2 py-2 text-left font-normal whitespace-normal", activeValue === option.value && "bg-accent text-accent-foreground")}
          onMouseDown={event => event.preventDefault()}
          onMouseMove={() => { if (!option.disabled) setActive(option.value); }}
          onClick={() => choose(option)}
        >
          <Check aria-hidden="true" className={cn("size-4 shrink-0", option.value !== value && "invisible")} />
          <span className="min-w-0"><span className="block break-words">{option.label}</span>{option.description && <span id={`${listId}-${index}-description`} className="mt-0.5 block break-words text-xs text-muted-foreground">{option.description}</span>}</span>
        </Button>)}
        {!filtered.length && <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
      </div>
      <p role="status" aria-live="polite" className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">{filtered.length} kết quả</p>
    </PopoverContent>
  </Popover>;
});
