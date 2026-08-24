import { useEffect, useState, type RefObject } from "react";

/** Walks up to the nearest ancestor that actually scrolls, or null for the window. */
const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
  let current = node?.parentElement ?? null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (overflowY === "auto" || overflowY === "scroll") return current;
    current = current.parentElement;
  }
  return null;
};

/** Distance below the top of the scrollport at which a section counts as current. */
const ACTIVATION_OFFSET = 160;

/**
 * Tracks which of `ids` is currently in view. The active section is the last one
 * whose top edge has crossed the activation line, which keeps a tall section
 * highlighted for as long as the reader is inside it.
 */
export function useActiveSection(
  ids: readonly string[],
  rootRef: RefObject<HTMLElement | null>
): string {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    const container = getScrollParent(rootRef.current);
    const scrollTarget: HTMLElement | Window = container ?? window;

    const update = () => {
      const atBottom = container
        ? container.scrollTop + container.clientHeight >=
          container.scrollHeight - 8
        : window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 8;

      if (atBottom) {
        setActiveId(ids[ids.length - 1] ?? "");
        return;
      }

      const threshold =
        (container ? container.getBoundingClientRect().top : 0) +
        ACTIVATION_OFFSET;

      let next = ids[0] ?? "";
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= threshold) {
          next = id;
        }
      }
      setActiveId(next);
    };

    update();
    scrollTarget.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    // Grids and charts change the page height after mount, which moves the
    // section boundaries without firing a scroll or resize event.
    const observer = new ResizeObserver(update);
    if (rootRef.current) observer.observe(rootRef.current);

    return () => {
      scrollTarget.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [ids, rootRef]);

  return activeId;
}

export function scrollToSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
