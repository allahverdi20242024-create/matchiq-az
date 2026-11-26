"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ label, timeoutLabel }: { label: string; timeoutLabel: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      attempts += 1;
      if (attempts === 12) {
        window.clearInterval(timer);
        setTimedOut(true);
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [router]);

  return <p className="muted source text-sm" role="status">{timedOut ? timeoutLabel : label}</p>;
}
