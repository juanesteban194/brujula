"use client";

import { useState, useCallback } from "react";

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; lat: number; lon: number }
  | { status: "error"; message: string };

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const request = useCallback(() => {
    if (typeof window === "undefined") return;

    // Geolocation only works in a secure context (HTTPS or localhost).
    // Over http://<LAN-IP> (phone testing) the browser blocks it.
    if (!window.isSecureContext) {
      setState({
        status: "error",
        message: "La ubicación necesita HTTPS. En el celular usa el sitio publicado, o marca tu punto tocando el mapa.",
      });
      return;
    }

    if (!navigator.geolocation) {
      setState({ status: "error", message: "Tu navegador no soporta geolocalización" });
      return;
    }

    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: "success", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        setState({
          status: "error",
          message:
            err.code === 1
              ? "Permiso de ubicación denegado. Marca tu punto en el mapa."
              : "No se pudo obtener la ubicación. Marca tu punto en el mapa.",
        }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  return { ...state, request };
}
