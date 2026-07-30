// Fire-and-forget analytics beacon — never blocks gameplay.
export function track(metric: "visit" | "play" | "solve" | "reveal", gameSlug = ""): void {
  try {
    const body = JSON.stringify({ metric, gameSlug });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}
