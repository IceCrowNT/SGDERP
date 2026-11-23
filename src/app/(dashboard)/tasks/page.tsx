import { Suspense } from 'react';
import { getSupportTasks } from '@/actions/support-task';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListSchema } from '@/lib/support-task';
export const metadata={title:'Công việc của tôi | SDG ERP'};
export default async function Page({searchParams}:{searchParams:Promise<{tab?:string}>}){const params=await searchParams;const parsed=TaskListSchema.safeParse({tab:params.tab});const tab=parsed.success?parsed.data.tab:'all';const data=await getSupportTasks({tab});if(!data.success)return <p role="alert">{data.message}</p>;return <Suspense fallback={<Skeleton className="h-64 w-full"/>}><TaskBoard initial={data} initialTab={tab}/></Suspense>;}
