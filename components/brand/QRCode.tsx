"use client";

import { QRCodeSVG } from "qrcode.react";

interface BrujulaQRProps {
  url?: string;
  size?: number;
  caption?: string;
}

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin + "/route" : "https://brujula.vercel.app/route");

export function BrujulaQR({ url = DEFAULT_URL, size = 240, caption }: BrujulaQRProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="p-4 rounded-2xl"
        style={{ background: "#F5F7FA" }}
      >
        <QRCodeSVG
          value={url}
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
