"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { assetPath } from "@/lib/asset-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Label = { id: number; code: string; name: string };

async function printLabel(png: string, code: string, name: string) {
  const frame = document.createElement("iframe");
  frame.title = "In tem tài sản";
  frame.className = "fixed h-0 w-0 border-0";
  document.body.append(frame);
  try {
    const doc = frame.contentDocument!;
    doc.documentElement.lang = "vi";
    doc.title = `Tem ${code}`;
    // Standalone print document: fixed physical QR size, independent of app theme.
    const style = doc.createElement("style");
    style.textContent = "@page{size:auto;margin:10mm}body{margin:0;font:12pt Arial,sans-serif;color:black;background:white}main{width:60mm;text-align:center;break-inside:avoid}img{display:block;width:40mm;height:40mm;margin:auto}h1{font-size:12pt;margin:2mm 0;overflow-wrap:anywhere}p{font-size:10pt;margin:0;overflow-wrap:anywhere}";
    doc.head.append(style);
    const label = doc.createElement("main");
    const image = doc.createElement("img");
    image.alt = `QR ${code}`; image.src = png;
    const heading = doc.createElement("h1"); heading.textContent = code;
    const caption = doc.createElement("p"); caption.textContent = name;
    label.append(image, heading, caption); doc.body.append(label);
    await image.decode();
    frame.contentWindow!.addEventListener("afterprint", () => frame.remove(), { once: true });
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    // Some browsers don't dispatch afterprint; leave enough time for their print UI.
    window.setTimeout(() => frame.remove(), 60_000);
  } catch {
    frame.remove(); throw new Error("print-failed");
  }
}

function QrContent({ id, code, name }: Label) {
  const [ready, setReady] = useState<{ png: string; url: string; local: boolean } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const url = new URL(assetPath(id), window.location.origin).href;
    import("qrcode").then(qr => qr.toDataURL(url, { errorCorrectionLevel: "M", margin: 4, scale: 8 }))
      .then(png => {
        if (!cancelled) setReady({ png, url, local: ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(window.location.hostname) });
      }).catch(() => { if (!cancelled) setError("Không tạo được QR. Hãy thử lại."); });
    return () => { cancelled = true; };
  }, [id, attempt]);

  return <div className="space-y-3 border-t p-4">
    {error ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => { setError(""); setAttempt(v => v + 1); }}>Thử lại QR</Button></div>
      : !ready ? <Skeleton aria-label="Đang tạo QR" className="mx-auto size-48" />
        : <>
          <figure className="space-y-2 text-center">
            <Image unoptimized src={ready.png} alt={`Mã QR của tài sản ${code}`} width={224} height={224} className="mx-auto h-auto w-56 max-w-full rounded-lg" />
            <figcaption><p className="break-words font-semibold">{code}</p><p className="break-words text-sm text-muted-foreground">{name}</p></figcaption>
          </figure>
          {ready.local && <p role="status" className="rounded-lg border bg-muted p-3 text-sm">QR đang dùng địa chỉ localhost, điện thoại khác không mở được. Hãy truy cập ERP bằng địa chỉ dùng chung trước khi tải hoặc in tem sử dụng thực tế.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-10" onClick={() => {
              const link = document.createElement("a"); link.href = ready.png;
              link.download = `QR-${code.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
              document.body.append(link); link.click(); link.remove();
            }}><Download aria-hidden="true" className="size-4" />Tải QR</Button>
            <Button variant="outline" className="min-h-10" disabled={printing} onClick={async () => {
              setPrinting(true);
              try { await printLabel(ready.png, code, name); }
              catch { toast.error("Không mở được cửa sổ in. Hãy tải QR và thử lại."); }
              finally { setPrinting(false); }
            }}><Printer aria-hidden="true" className="size-4" />{printing ? "Đang mở in…" : "In tem"}</Button>
            <Button variant="outline" className="min-h-10" onClick={async () => {
              try { await navigator.clipboard.writeText(ready.url); toast.success("Đã sao chép liên kết tài sản."); }
              catch { toast.error("Không thể sao chép tự động. Hãy chọn và sao chép liên kết bên dưới."); }
            }}><Copy aria-hidden="true" className="size-4" />Sao chép liên kết</Button>
          </div>
          <Input aria-label="Liên kết tài sản" readOnly value={ready.url} onFocus={event => event.currentTarget.select()} className="text-base" />
        </>}
  </div>;
}

export function AssetQrCard(props: Label) {
  const [open, setOpen] = useState(false);
  return <details className="rounded-xl border bg-card" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer rounded-xl p-3 text-sm font-medium focus-visible:outline-ring"><QrCode aria-hidden="true" className="mr-2 inline size-4" />Tem QR</summary>
    {open && <QrContent key={props.id} {...props} />}
  </details>;
}
