"use client";

import { useEffect, useState } from "react";
import { StaffToolbarView, type StaffToolbarData } from "@/components/staff/toolbar-view";

export function StaffToolbarClient() {
  const [data, setData] = useState<StaffToolbarData | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.cookie.split("; ").some((row) => row.startsWith("nera_staff_ui="))) return;
    let cancelled = false;
    fetch("/api/staff-chrome", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: StaffToolbarData | null) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  return <StaffToolbarView {...data} />;
}
