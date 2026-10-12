import { useState, useEffect } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Starting soon";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return "Starting soon";
}

// Ticks every 60s, not every second — campaigns require a 24h+ lead time, so
// minute-granularity ("Starts in 2d 4h") is visually indistinguishable from
// a per-second tick for anything beyond the final minute, and a 1s interval
// across every mounted countdown (tab button + every row in a campaign list)
// is wasted re-render for a background panel.
export function useCountdown(targetDate?: string, intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [targetDate, intervalMs]);

  if (!targetDate) {
    return { label: "", hasStarted: true };
  }

  const remaining = new Date(targetDate).getTime() - now;
  return { label: formatRemaining(remaining), hasStarted: remaining <= 0 };
}
