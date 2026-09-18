"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// Server render and first client paint agree on "light"; ThemeScript sets the real class earlier.
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage may be unavailable (private mode); the toggle still works for the session.
    }
  }

  const label = theme === "dark" ? t("themeLight") : t("themeDark");
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
