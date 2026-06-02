"use client";

import { useEffect, useState } from "react";

export function useTimeAgo(timestamp: number | null): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!timestamp) return;

    const update = () => {
      const diff = Math.floor((Date.now() - timestamp) / 1000);
      if (diff < 60) setLabel("Actualizado hace < 1 min");
      else if (diff < 3600) setLabel(`Actualizado hace ${Math.floor(diff / 60)} min`);
      else setLabel(`Actualizado hace ${Math.floor(diff / 3600)} h`);
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
}
