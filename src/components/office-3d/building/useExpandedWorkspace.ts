"use client";

import { useEffect, useRef, useState } from "react";

// Portalled pickers/dialogs own Escape and focus while they are above the viewer.
export function hasWorkspaceOverlay(workspace: HTMLElement | null) {
  return Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
  )).some((el) => el !== workspace && el.getClientRects().length > 0);
}

export function useExpandedWorkspace() {
  const [expanded, setExpanded] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!expanded || !workspace) return;
    const expandButton = expandButtonRef.current;
    const scroll = { x: window.scrollX, y: window.scrollY };
    const overflow = document.body.style.overflow;
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    // Keep the same Canvas in place. Isolate only existing background branches;
    // future Radix portals must remain interactive above this workspace.
    let branch: HTMLElement = workspace;
    while (branch.parentElement) {
      for (const element of branch.parentElement.children) {
        if (element instanceof HTMLElement && element !== branch) {
          siblings.push({ element, inert: element.inert });
          element.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    document.body.style.overflow = "hidden";
    expandButton?.focus({ preventScroll: true });

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.defaultPrevented || hasWorkspaceOverlay(workspace)) return;
      const targets = Array.from(workspace!.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
      )).filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== "hidden" && !el.closest("[inert]"));
      const first = targets[0], last = targets.at(-1);
      if (!first) { event.preventDefault(); workspace!.focus(); return; }
      if (!workspace!.contains(document.activeElement) ||
        (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      for (const { element, inert } of siblings) element.inert = inert;
      document.body.style.overflow = overflow;
      if (expandButton?.isConnected) expandButton.focus({ preventScroll: true });
      window.scrollTo({ left: scroll.x, top: scroll.y, behavior: "instant" });
    };
  }, [expanded]);

  return { expanded, setExpanded, workspaceRef, expandButtonRef };
}
