import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TaskDetail } from '@/components/tasks/TaskDetail';
export const metadata={title:'Chi tiết công việc | SDG ERP'};
export default async function Page({params}:{params:Promise<{id:string}>}){const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)notFound();return <div className="mx-auto w-full max-w-4xl space-y-4"><Link href="/tasks" className="inline-flex min-h-10 items-center text-sm text-primary hover:underline">← Công việc của tôi</Link><TaskDetail id={id}/></div>;}
