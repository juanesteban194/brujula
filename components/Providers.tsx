"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLayersStore } from "@/lib/store/layersStore";
import { useUiStore } from "@/lib/store/uiStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min
            gcTime: 15 * 60 * 1000,   // 15 min
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Rehydrate persisted prefs AFTER mount (avoids SSR hydration mismatch)
  useEffect(() => {
    useLayersStore.persist.rehydrate();
    useUiStore.persist.rehydrate();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
