"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface BrujulaQRProps {
  url?: string;
  size?: number;
  caption?: string;
}

// NEXT_PUBLIC_* is inlined identically on server and client, so this initial
// value is deterministic → no hydration mismatch.
const ENV_URL = process.env.NEXT_PUBLIC_APP_URL;
const SSR_FALLBACK = "https://brujula.vercel.app/route";

export function BrujulaQR({ url, size = 240, caption }: BrujulaQRProps) {
  // Render the same URL on server and first client paint; only after mount do
  // we upgrade to the live origin (so the QR reflects the current host when no
  // explicit url/env is set — without breaking hydration).
  const [resolved, setResolved] = useState(url ?? ENV_URL ?? SSR_FALLBACK);

  useEffect(() => {
    if (url || ENV_URL) return; // explicit prop or env var is already deterministic
    if (typeof window !== "undefined") {
      setResolved(`${window.location.origin}/route`);
    }
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="p-4 rounded-2xl"
        style={{ background: "#F5F7FA" }}
      >
        <QRCodeSVG
          value={resolved}
          size={size}
          bgColor="#F5F7FA"
          fgColor="#0A0E14"
          level="M"
          includeMargin={false}
        />
      </div>
      {caption && (
        <p className="text-sm text-text-secondary text-center max-w-[200px]">
          {caption}
        </p>
      )}
    </div>
  );
}
