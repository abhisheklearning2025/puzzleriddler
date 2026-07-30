"use client";

import { useEffect } from "react";
import { track } from "@/components/games/shared/track";

/** Records one visit per browser session. */
export function TrackVisit() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("pr_visited")) return;
      sessionStorage.setItem("pr_visited", "1");
    } catch {}
    track("visit");
  }, []);
  return null;
}
