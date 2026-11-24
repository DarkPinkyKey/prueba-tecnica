import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(): RefObject<HTMLElement | null> {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    getFocusableElements(dialog)[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) =>
      trapDialogTab(event, dialog);
    dialog.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      if (opener?.isConnected) {
        opener.focus();
        return;
      }
      const fallbackSelector = dialog.dataset.focusFallback;
      if (fallbackSelector) {
        document.querySelector<HTMLElement>(fallbackSelector)?.focus();
      }
    };
  }, []);

  return dialogRef;
}

function trapDialogTab(event: KeyboardEvent, dialog: HTMLElement) {
  if (event.key !== "Tab") return;
  const focusable = getFocusableElements(dialog);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const active = document.activeElement;
  const outsideDialog = !active || !dialog.contains(active);
  if (event.shiftKey && (active === first || active === dialog || outsideDialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outsideDialog)) {
    event.preventDefault();
    first.focus();
  }
}

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute("hidden") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}
