"use client";

import { useEffect, useMemo, useState } from "react";

export function useSingleInstance(key: string) {
  const tabId = useMemo(() => crypto.randomUUID(), []);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel("exampool-single-instance");
    const heartbeatKey = `exampool-heartbeat-${key}`;

    const claim = () => {
      const payload = JSON.stringify({ key, tabId, ts: Date.now() });
      localStorage.setItem(heartbeatKey, payload);
      channel.postMessage({ type: "claim", key, tabId });
    };

    const interval = setInterval(claim, 5000);
    claim();

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.key !== key) return;
      if (data.tabId !== tabId && data.type === "claim") {
        setBlocked(true);
      }
    };

    channel.addEventListener("message", onMessage);

    return () => {
      clearInterval(interval);
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [key, tabId]);

  return { blocked };
}
