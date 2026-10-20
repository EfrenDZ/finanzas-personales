"use client";

import { useState, useEffect } from "react";
import { getUserApiToken, regenerateUserApiToken } from "../actions/user";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    let isCancelled = false;
    if (isOpen) {
      getUserApiToken()
        .then((tok) => {
          if (!isCancelled) setToken(tok);
        })
        .catch((err) => console.error("Error al obtener token:", err))
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm("¿Seguro que deseas regenerar tu Token? Los atajos que tengan el token anterior dejarán de funcionar.")) {
      return;
    }
    setLoading(true);
    try {
      const newToken = await regenerateUserApiToken();
      setToken(newToken);
      setCopied(false);
    } catch (err) {
      console.error(err);
      alert("No se pudo regenerar el token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
              ⚡️
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Atajos de iPhone (Siri)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tu Token Personal de Integración
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Token Personal */}
        <div className="mt-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tu API Key Personal
              </span>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-50"
              >
                Regenerar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={loading ? "Cargando token..." : token}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={loading || !token}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white"
                }`}
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Este token identifica tu cuenta. Cualquier gasto registrado con él se guardará en tus billeteras.
            </p>
          </div>

          {/* Configuración rápida del Atajo */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Datos para el Atajo de iOS
            </h3>

            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Encabezado (Header):</span>
                <div className="mt-1 font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-200/50 dark:border-blue-900/60">
                  <span className="text-blue-600 dark:text-blue-400">Clave:</span> x-api-key<br />
                  <span className="text-blue-600 dark:text-blue-400">Texto:</span> {token || "tu_token"}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">URL para registrar Gasto:</span>
                <div className="mt-1 font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-200/50 dark:border-blue-900/60 break-all">
                  {origin ? `${origin}/api/shortcuts/expense` : "/api/shortcuts/expense"}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">URL para Abono a Deudores:</span>
                <div className="mt-1 font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-200/50 dark:border-blue-900/60 break-all">
                  {origin ? `${origin}/api/shortcuts/receivable-payment` : "/api/shortcuts/receivable-payment"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
