"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getRoomLinkOptions, linkOfficeRoom } from "@/actions/office-room-link";
import { RoomLinkSchema, type RoomLinkInput } from "@/lib/office-3d/room-link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormRequiredHint } from "@/components/ui/form";

export function RoomLinkDialog({roomKey,roomName}:{roomKey:string;roomName:string}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
  return <Dialog open={open} onOpenChange={next=>{if(!busy)setOpen(next);}}>
    <DialogTrigger asChild><Button variant="outline" className="min-h-10"><Link2 className="size-4"/>Liên kết vị trí</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg" showCloseButton={!busy} onInteractOutside={e=>e.preventDefault()}>
      <DialogHeader><DialogTitle>Liên kết vị trí phòng</DialogTitle><DialogDescription>{roomName} — chọn phòng tương ứng để bắt đầu quản lý.</DialogDescription></DialogHeader>
      {open && <RoomLinkForm roomKey={roomKey} onBusy={setBusy} onClose={()=>setOpen(false)}/>}
    </DialogContent>
  </Dialog>;
}
function RoomLinkForm({roomKey,onBusy,onClose}:{roomKey:string;onBusy:(busy:boolean)=>void;onClose:()=>void}) {
  const router=useRouter();
  const [options,setOptions]=useState<Awaited<ReturnType<typeof getRoomLinkOptions>>|null>(null);
  const [attempt,setAttempt]=useState(0),[error,setError]=useState("");
  const [pending,start]=useTransition();
  const form=useForm<RoomLinkInput>({resolver:zodResolver(RoomLinkSchema),defaultValues:{roomKey,locationId:0}});
  useEffect(()=>{
    let cancelled=false;
    getRoomLinkOptions(roomKey).then(result=>{if(!cancelled)setOptions(result);})
      .catch(()=>{if(!cancelled)setOptions({success:false,message:"Không tải được danh sách. Vui lòng thử lại."});});
    return ()=>{cancelled=true;};
  },[roomKey,attempt]);
  function reload(){setError("");setOptions(null);setAttempt(n=>n+1);form.reset({roomKey,locationId:0});}
  if(!options)return <p role="status" className="text-sm text-muted-foreground">Đang tải vị trí…</p>;
  if(!options.success)return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{options.message}</p><Button variant="outline" onClick={reload}>Thử lại</Button></div>;
  if(!options.rooms.length)return <div className="space-y-3"><p className="text-sm">{options.floorName} chưa có phòng phù hợp để liên kết. Hãy tạo vị trí loại Phòng trong tầng này hoặc kiểm tra các liên kết đã có.</p><Button asChild variant="outline"><Link href="/locations">Mở danh mục vị trí</Link></Button><Button variant="ghost" onClick={reload}>Tải lại danh sách</Button></div>;
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(data=>{
    setError("");onBusy(true);
    start(async()=>{try{
      const result=await linkOfficeRoom(data);
      if(!result.success){setError(result.message);return;}
      toast.success("Đã liên kết phòng. Bạn có thể thêm vị trí và gán dữ liệu.");
      onClose();router.refresh();
    }catch{setError("Kết nối bị gián đoạn. Hãy tải lại mô hình để kiểm tra trước khi thử lại.");}
    finally{onBusy(false);}});
  })}>
    <FormRequiredHint/>
    <FormField control={form.control} name="locationId" render={({field})=><FormItem>
      <FormLabel required>Phòng tại {options.floorName}</FormLabel>
      <Select disabled={pending} value={field.value ? String(field.value):""} onValueChange={value=>field.onChange(Number(value))}>
        <FormControl><SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required><SelectValue placeholder="Chọn phòng tương ứng"/></SelectTrigger></FormControl>
        <SelectContent>{options.rooms.map(room=><SelectItem key={room.id} value={String(room.id)}>{room.name}</SelectItem>)}</SelectContent>
      </Select><FormMessage/>
    </FormItem>}/>
    {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" disabled={pending} onClick={reload}>Tải lại danh sách</Button></div>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Hủy</Button><Button type="submit" disabled={pending}>{pending&&<Loader2 className="size-4 animate-spin"/>}Liên kết phòng</Button></div>
  </form></Form>;
}
