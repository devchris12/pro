"use client";

import { useRef, useEffect } from "react";
import {
  useFilterPaneContext,
  type ContentFilterDef,
} from "@/app/contexts/FilterPaneContext";

/**
 * useRegisterPageFilters — registers page-level content filter definitions
 * with the global FilterPane via FilterPaneContext.
 *
 * Call this inside a tier content component (BasicContent, IntContent, etc.)
 * to make the right-side pane show that page's filters.
 *
 * Pattern (React Query explanation for context):
 *   The hook keeps a ref of the latest filter defs so callbacks (onToggle,
 *   onClearAll) always call the current version. The serialized string detects
 *   changes to options or selected values and re-syncs the context without
 *   causing flicker (no cleanup on dep-change, only on unmount).
 *
 * Example:
 *   useRegisterPageFilters([
 *     { id: "category", label: "Category", options: cats, selected: selectedCats,
 *       onToggle: toggleCat, onClearAll: () => setSelectedCats([]) },
 *   ]);
 */
export function useRegisterPageFilters(filterDefs: ContentFilterDef[]): void {
  const { setContentFilters } = useFilterPaneContext();

  // Ref always holds the latest defs so stable callback wrappers stay fresh
  const defsRef = useRef<ContentFilterDef[]>(filterDefs);
  defsRef.current = filterDefs;

  // Serialise only display data (id + options + selected) to detect real changes
  const serialized = filterDefs
    .map((f) => {
      const optionsStable = [...f.options].sort().join(",");
      const selectedStable = [...f.selected].sort().join(",");
      return `${f.id}:${optionsStable}:${selectedStable}`;
    })
    .join("||");

  // Build filter objects whose callbacks always delegate through the ref
  const buildFilters = (): ContentFilterDef[] =>
    defsRef.current.map((f) => ({
      id: f.id,
      label: f.label,
      options: f.options,
      selected: f.selected,
      onToggle: (v: string) => {
        defsRef.current.find((x) => x.id === f.id)?.onToggle(v);
      },
      onClearAll: () => {
        defsRef.current.find((x) => x.id === f.id)?.onClearAll();
      },
    }));

  // Sync whenever options or selected values change (and on initial mount)
  // NOTE: no cleanup here — prevents flicker when deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setContentFilters(buildFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  // Clear registrations on page/component unmount only
  useEffect(() => {
    return () => setContentFilters([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
