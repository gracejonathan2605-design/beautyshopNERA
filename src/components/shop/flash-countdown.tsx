"use client";

import { useEffect, useRef, useState } from "react";
import { formatFlashCountdown, remainingMs } from "@/lib/flash";

export function FlashCountdown({
  endAt,
  onExpired,
}: {
  endAt: Date | string;
  onExpired?: () => void;
}) {
  const expired = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const remaining = remainingMs(endAt, new Date(now));
  const { label, urgency } = formatFlashCountdown(remaining);
  const liveSeconds = remaining > 0 && remaining <= 60 * 60 * 1000;
  const liveMinutes = remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
  const running = remaining > 0;

  useEffect(() => {
    if (!running) return;
    const tickMs = liveSeconds ? 1000 : liveMinutes ? 30_000 : 60_000;
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [liveSeconds, liveMinutes, running]);

  useEffect(() => {
    if (remaining > 0) expired.current = false;
    if (remaining <= 0 && !expired.current) {
      expired.current = true;
      onExpired?.();
    }
  }, [remaining, onExpired]);

  const className =
    urgency === "critical"
      ? "flash-count flash-count-critical"
      : urgency === "urgent"
        ? "flash-count flash-count-urgent"
        : urgency === "soon"
          ? "flash-count flash-count-soon"
          : "flash-count";

  return (
    <p
      className={className}
      suppressHydrationWarning
      aria-live={urgency === "urgent" || urgency === "critical" ? "polite" : undefined}
    >
      {label}
    </p>
  );
}
