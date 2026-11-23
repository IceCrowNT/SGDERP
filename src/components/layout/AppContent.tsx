"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Forms keep readable line lengths; tables and workspaces use the available width. */
export function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const contained = pathname === "/profile" || pathname === "/settings" || pathname.startsWith("/settings/");
  const landing = pathname === "/asset-management" || pathname === "/hr" || pathname === "/system";

  return (
    <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-5 lg:p-6">
      <div className={cn("mx-auto w-full min-w-0", contained ? "max-w-5xl" : landing ? "max-w-7xl" : "max-w-none")}>
        {children}
      </div>
    </main>
  );
}
