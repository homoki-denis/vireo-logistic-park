"use client";
import { useEffect, useState } from "react";

export const MOBILE_QUERY = "(max-width: 760px)";

export const isMobileNow = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

/** true on phones / narrow windows (≤ 760 px) */
export function useIsMobile() {
  const [m, setM] = useState(isMobileNow);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}
