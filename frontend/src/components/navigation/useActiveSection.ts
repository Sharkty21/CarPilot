import { useEffect, useState, type RefObject } from "react";

/** Walks up to the nearest ancestor that actually scrolls, or null for the window. */
const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
  let current = node?.parentElement ?? null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay"
    ) {
      return current;
    }
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
 *
 * `bindKey` must change whenever the scroll content mounts or swaps (e.g. the
 * selected vehicle id). The page often renders a loading state first, so the
 * root ref is null on the initial effect run — without a rebind key the spy
 * would stay attached to `window` and incorrectly lock on the last section.
 */
export function useActiveSection(
  ids: readonly string[],
  rootRef: RefObject<HTMLElement | null>,
  bindKey?: unknown
): string {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    const root = rootRef.current;
    // Content not mounted yet (loading / empty). Keep the default first section.
    if (!root) {
      setActiveId(ids[0] ?? "");
      return;
    }

    const container = getScrollParent(root);
    const scrollTarget: HTMLElement | Window = container ?? window;

    const update = () => {
      // Only treat "at bottom" as the last section when the port can actually
      // scroll. With a non-scrolling window (layout scrolls inside <main>), the
      // naive check is always true and locks the nav on the final item.
      const scrollable = container
        ? container.scrollHeight > container.clientHeight + 8
        : document.documentElement.scrollHeight > window.innerHeight + 8;

      const atBottom =
        scrollable &&
        (container
          ? container.scrollTop + container.clientHeight >=
            container.scrollHeight - 8
          : window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 8);

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
    observer.observe(root);

    return () => {
      scrollTarget.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [ids, rootRef, bindKey]);

  return activeId;
}

export function scrollToSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
