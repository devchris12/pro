"use client";

/**
 * EditableGreeting — renders just the name portion of a page greeting.
 * Hover → pencil icon appears. Click → inline input. Enter/blur → save to sessionStorage.
 * The saved name persists across all pages and sessions.
 *
 * Usage:
 *   <h1>{greeting}, <EditableGreeting fallbackName={firstName} /> 👋</h1>
 */

import React, { useState, useEffect, useRef } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";

const STORAGE_KEY = "greeting-display-name";

interface EditableGreetingProps {
  /** Name to show if the user hasn't set a custom one (e.g. first_name from profile or "there") */
  fallbackName: string;
}

export function EditableGreeting({ fallbackName }: EditableGreetingProps): React.ReactElement {
  const [customName,  setCustomName]  = useState<string | null>(null);
  const [nameHovered, setNameHovered] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [editValue,   setEditValue]   = useState("");
  const skipBlurSaveRef = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setCustomName(saved);
  }, []);

  const displayName = customName ?? fallbackName;

  const startEdit = (): void => {
    setEditValue(displayName);
    setNameEditing(true);
    setNameHovered(false);
  };

  const saveEdit = (): void => {
    const trimmed = editValue.trim();
    if (trimmed) {
      sessionStorage.setItem(STORAGE_KEY, trimmed);
      setCustomName(trimmed);
    }
    setNameEditing(false);
  };

  return (
    <span
      className="relative inline-flex items-center gap-1.5"
      onMouseEnter={() => { if (!nameEditing) setNameHovered(true); }}
      onMouseLeave={() => setNameHovered(false)}
    >
      {nameEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")  saveEdit();
            if (e.key === "Escape") {
              // Escape means "cancel edit", so ignore the blur-triggered save.
              skipBlurSaveRef.current = true;
              setNameEditing(false);
            }
          }}
          onBlur={() => {
            if (skipBlurSaveRef.current) {
              skipBlurSaveRef.current = false;
              return;
            }
            saveEdit();
          }}
          className="bg-transparent border-b-2 border-primary dark:border-blue-400 outline-none text-2xl font-bold text-gray-900 dark:text-slate-100 leading-tight"
          style={{ width: `${Math.max(editValue.length, 4)}ch` }}
          aria-label="Edit display name"
        />
      ) : (
        <>
          {displayName}
          {nameHovered && (
            <button
              onClick={startEdit}
              className="inline-flex items-center justify-center size-5 rounded-full text-gray-300 dark:text-slate-600 hover:text-primary dark:hover:text-blue-400 hover:bg-primary/8 dark:hover:bg-blue-950/50 transition-colors"
              aria-label="Edit display name"
            >
              <PencilIcon className="size-3" />
            </button>
          )}
        </>
      )}
    </span>
  );
}
