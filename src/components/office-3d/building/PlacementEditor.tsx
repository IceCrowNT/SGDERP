"use client";
import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, MapPin, Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { saveOfficePlacement } from "@/actions/office-placement";
import { PlacementSchema, placementError, type PlacementDraft, type PlacementInput } from "@/lib/office-3d/placement";
import type { PlacedObject } from "@/lib/office-3d/building-mapping";

export function PlacementEditor({ draft, roomName, objects, onChange, onCancel, onSaved, onBusy }: {
  draft:PlacementDraft; roomName:string; objects:PlacedObject[];
  onChange:(value:PlacementDraft)=>void; onCancel:()=>void; onSaved:(key:string)=>void; onBusy:(busy:boolean)=>void;
}) {
  const [pending,start] = useTransition();
  const [error,setError] = useState("");
  const {point,...metadata}=draft;
  const form = useForm<PlacementInput>({resolver:zodResolver(PlacementSchema),values:{...metadata,x:point?.x ?? 0,z:point?.z ?? 0}});
  const geometryError = draft.point ? placementError(draft.roomKey,{...draft,...draft.point},objects.filter(o => o.roomKey === draft.roomKey && o.id !== draft.id)) : null;
  function move(dx:number,dz:number) {
    const p = draft.point ?? {x:0,z:0};
    onChange({...draft,point:{x:Number((p.x+dx).toFixed(2)),z:Number((p.z+dz).toFixed(2))}});
  }
  return <Form {...form}><form noValidate aria-label="Bố trí vị trí trên 3D" className="space-y-4" onSubmit={form.handleSubmit(data => {
    setError("");
    if (!draft.point) {setError("Chọn điểm đặt trên mặt bằng hoặc dùng nút Đặt giữa phòng.");return;}
    if (geometryError) {setError(geometryError);return;}
    start(async()=>{
      onBusy(true);
      try {
        const result=await saveOfficePlacement(data);
        if (!result.success) {
          setError(result.message);
          if ("fieldErrors" in result && result.fieldErrors) for (const [key,messages] of Object.entries(result.fieldErrors)) {
            if(messages?.[0]) form.setError(key as FieldPath<PlacementInput>,{message:messages[0]},{shouldFocus:true});
          }
          return;
        }
        toast.success(draft.id ? "Đã cập nhật bố trí" : "Đã tạo vị trí. Bạn có thể gắn tài sản ngay.");
        onSaved(result.pointKey);
      } catch {setError("Kết nối bị gián đoạn. Hãy cập nhật dữ liệu trước khi thử lại.");}
      finally {onBusy(false);}
    });
  },()=>setError("Kiểm tra các trường được đánh dấu."))}>
    <div><h3 className="text-lg font-semibold">{draft.id ? "Chỉnh bố trí" : "Thêm vị trí trên 3D"}</h3><p className="mt-1 text-sm text-muted-foreground">{roomName}</p></div>
    <FormRequiredHint/>
    <fieldset disabled={pending} className="space-y-4">
      <FormField control={form.control} name="name" render={({field})=><FormItem><FormLabel required>Tên vị trí</FormLabel><FormControl>
        <Input {...field} maxLength={255} placeholder="Ví dụ: Bàn IT, Góc máy in" onChange={e=>{field.onChange(e);onChange({...draft,name:e.target.value});}}/>
      </FormControl><FormMessage/></FormItem>}/>
      <FormField control={form.control} name="kind" render={()=><FormItem><FormLabel required={!draft.id}>Loại vị trí</FormLabel>
      <div role="group" aria-label="Loại vị trí" className="grid grid-cols-2 gap-2">
        {([['BAN','Bàn làm việc',Monitor],['DIEM','Điểm thiết bị',MapPin]] as const).map(([kind,label,Icon]) =>
          <Button key={kind} type="button" disabled={Boolean(draft.id)} aria-pressed={draft.kind===kind} variant={draft.kind===kind ? "secondary":"outline"}
            className="h-auto min-h-16 flex-col whitespace-normal px-2 text-xs" onClick={()=>onChange({...draft,kind})}><Icon className="size-5"/>{label}</Button>)}
      </div><FormMessage/></FormItem>}/>
      <div className="rounded-lg bg-muted p-3 text-sm"><p className="mb-1 font-medium">Điểm đặt <span className="text-destructive" aria-hidden="true">*</span></p>Bấm vào khoảng trống trên mặt bằng để đặt. Dùng các nút bên dưới để tinh chỉnh.</div>
      <div className="flex items-center justify-center gap-3">
        <div className="grid grid-cols-3 gap-1">
          <span/><Button type="button" size="icon" variant="outline" aria-label="Dịch lên" onClick={()=>move(0,-.2)}><ArrowUp className="size-4"/></Button><span/>
          <Button type="button" size="icon" variant="outline" aria-label="Dịch trái" onClick={()=>move(-.2,0)}><ArrowLeft className="size-4"/></Button>
          <Button type="button" size="icon" variant="outline" aria-label="Đặt giữa phòng" title="Đặt giữa phòng" onClick={()=>onChange({...draft,point:{x:0,z:0}})}><MapPin className="size-4"/></Button>
          <Button type="button" size="icon" variant="outline" aria-label="Dịch phải" onClick={()=>move(.2,0)}><ArrowRight className="size-4"/></Button>
          <span/><Button type="button" size="icon" variant="outline" aria-label="Dịch xuống" onClick={()=>move(0,.2)}><ArrowDown className="size-4"/></Button><span/>
        </div>
        <Button type="button" variant="outline" onClick={()=>onChange({...draft,angle:((draft.angle+90)%360) as 0|90|180|270})}><RotateCw className="size-4"/>Xoay 90°</Button>
      </div>
    </fieldset>
    <p role="status" className={geometryError ? "text-sm text-destructive":"text-sm text-muted-foreground"}>{geometryError ?? (draft.point ? "Đã chọn điểm đặt. Bố trí này chưa được lưu." : "Chưa chọn điểm đặt.")}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="sticky bottom-0 flex gap-2 border-t bg-background py-3">
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Hủy</Button>
      <Button type="submit" className="flex-1" disabled={pending || Boolean(geometryError)}>{pending && <Loader2 className="size-4 animate-spin"/>}{pending ? "Đang lưu…":"Lưu vị trí"}</Button>
    </div>
    <p className="text-xs text-muted-foreground">Bố trí minh họa, chưa kiểm tra toàn bộ cửa và lối đi. Hãy đặt theo thực tế. Không tạo hồ sơ tài sản khi thêm bàn.</p>
  </form></Form>;
}
