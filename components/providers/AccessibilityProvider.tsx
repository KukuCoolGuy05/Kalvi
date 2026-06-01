"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  DEFAULT_ACCESSIBILITY_PREFS,
  type AccessibilityPrefs,
} from "@/types/learner";

/**
 * AccessibilityProvider
 *
 * Owns the user's accessibility preferences (dyslexic font, high contrast,
 * font size, reduced motion), persists them to localStorage, and — crucially —
 * applies them as classes / CSS variables on <html> so the entire app responds
 * without prop-drilling. This is why the toggles feel instant: we flip a class,
 * the CSS variables in globals.css cascade, no React re-render of content
 * needed.
 */

interface AccessibilityContextValue {
  prefs: AccessibilityPrefs;
  setPref: <K extends keyof AccessibilityPrefs>(
    key: K,
    value: AccessibilityPrefs[K]
  ) => void;
  toggle: (key: "dyslexicFont" | "highContrast" | "reduceMotion") => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const STORAGE_KEY = "kalvi:a11y";
const MIN_FONT = 14;
const MAX_FONT = 22;

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_ACCESSIBILITY_PREFS);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted prefs once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>;
        setPrefs({ ...DEFAULT_ACCESSIBILITY_PREFS, ...parsed });
      } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Honor the OS setting on first visit.
        setPrefs((p) => ({ ...p, reduceMotion: true }));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Apply prefs to <html> + persist whenever they change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("font-dyslexic", prefs.dyslexicFont);
    root.classList.toggle("theme-contrast", prefs.highContrast);
    root.classList.toggle("reduce-motion", prefs.reduceMotion);
    const size = Math.min(MAX_FONT, Math.max(MIN_FONT, prefs.fontSize));
    root.style.setProperty("--font-scale", `${size}px`);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [prefs, hydrated]);

  const setPref = useCallback<AccessibilityContextValue["setPref"]>((key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const toggle = useCallback<AccessibilityContextValue["toggle"]>((key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  return (
    <AccessibilityContext.Provider value={{ prefs, setPref, toggle }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}

export { MIN_FONT, MAX_FONT };
