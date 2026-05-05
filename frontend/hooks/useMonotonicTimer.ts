"use client";

import { useEffect, useRef, useState } from "react";

export function useMonotonicTimer(durationSeconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const startRef = useRef(performance.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = performance.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((performance.now() - startRef.current) / 1000);
      const left = Math.max(0, durationSeconds - elapsed);
      setRemaining(left);
      if (left === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onExpire();
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [durationSeconds, onExpire]);

  return remaining;
}
