"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Siren, Phone, Share2, X } from "lucide-react";
import { useRouteStore } from "@/lib/store/routeStore";
import { toast } from "sonner";

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const origen = useRouteStore((s) => s.origen);

  const call123 = () => {
    window.location.href = "tel:123";
  };

  const shareLocation = () => {
    const finish = (lat: number, lon: number) => {
      const maps = `https://www.google.com/maps?q=${lat},${lon}`;
      const text = `🚨 Necesito ayuda. Mi ubicación: ${maps} (lat ${lat.toFixed(5)}, lon ${lon.toFixed(5)})`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };
    if (origen) { finish(origen.lat, origen.lon); return; }
    if (typeof window !== "undefined" && window.isSecureContext && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => finish(p.coords.latitude, p.coords.longitude),
        () => toast.error("Activa tu ubicación o márcala en el mapa primero")
      );
    } else {
      toast.error("Activa tu ubicación o márcala en el mapa primero");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Emergencia 123"
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
        style={{ background: "rgba(255,77,94,0.16)", border: "1px solid rgba(255,77,94,0.5)", color: "#FF4D5E" }}
      >
        <Siren className="w-5 h-5" />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                className="w-full max-w-sm rounded-3xl p-6"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,77,94,0.16)" }}>
                      <Siren className="w-6 h-6" style={{ color: "#FF4D5E" }} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-base">Emergencia</h2>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Línea única nacional</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="touch-target" style={{ color: "var(--text-tertiary)" }} aria-label="Cerrar">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                  ¿Llamar a la línea de emergencias <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>123</span>?
                </p>

                <button
                  onClick={call123}
                  className="w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 mb-3 active:scale-[0.98] transition-transform"
                  style={{ background: "#FF4D5E", color: "#fff", boxShadow: "0 4px 16px rgba(255,77,94,0.35)" }}
                >
                  <Phone className="w-5 h-5" /> Llamar al 123
                </button>

                <button
                  onClick={shareLocation}
                  className="w-full h-12 rounded-2xl text-sm flex items-center justify-center gap-2 mb-2"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
                >
                  <Share2 className="w-4 h-4" /> Compartir mi ubicación
                </button>

                <button onClick={() => setOpen(false)} className="w-full h-10 text-sm" style={{ color: "var(--text-tertiary)" }}>
                  Cancelar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
