"use client";

/**
 * FilterPaneContext — allows page-level components to register content filter
 * definitions (options, selected values, toggle callbacks) with the global
 * FilterPane. The FilterPane reads from this context to display per-page filters.
 *
 * Usage: call `useRegisterPageFilters()` inside any tier content component
 * (BasicContent, IntContent, etc.) to register filters for the current page.
 * Filters are automatically cleared when the component unmounts (page change).
 */

import React, { createContext, useContext, useState } from "react";

export interface ContentFilterDef {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClearAll: () => void;
}

interface FilterPaneContextValue {
  contentFilters: ContentFilterDef[];
  setContentFilters: (filters: ContentFilterDef[]) => void;
}

const FilterPaneContext = createContext<FilterPaneContextValue>({
  contentFilters: [],
  setContentFilters: () => {},
});

export function FilterPaneProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [contentFilters, setContentFilters] = useState<ContentFilterDef[]>([]);

  return (
    <FilterPaneContext.Provider value={{ contentFilters, setContentFilters }}>
      {children}
    </FilterPaneContext.Provider>
  );
}

export function useFilterPaneContext(): FilterPaneContextValue {
  return useContext(FilterPaneContext);
}
