"use client";

import * as React from "react";
import { ContextMenu as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const ContextMenu = Primitive.Root;
export const ContextMenuTrigger = Primitive.Trigger;
export function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content
    className={cn("z-50 min-w-56 max-w-72 max-h-[var(--radix-context-menu-content-available-height)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md", className)}
    {...props} /></Primitive.Portal>;
}
export function ContextMenuItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={cn("flex min-h-10 cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", className)} {...props} />;
}
export function ContextMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn("break-words border-b px-2 py-2 text-sm font-semibold", className)} {...props} />;
}
