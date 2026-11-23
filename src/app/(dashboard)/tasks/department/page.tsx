import { Suspense } from 'react';
import { getSupportTasks } from '@/actions/support-task';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { Skeleton } from '@/components/ui/skeleton';
export const metadata={title:'Việc phòng ban | SDG ERP'};
export default async function Page(){const data=await getSupportTasks({tab:'department'});if(!data.success)return <p role="alert">{data.message}</p>;return <Suspense fallback={<Skeleton className="h-64 w-full"/>}><TaskBoard initial={data} department/></Suspense>;}
