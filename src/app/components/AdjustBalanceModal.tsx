"use client";

import { useState } from "react";
import { adjustWalletBalance } from "../actions/wallet";

interface AdjustBalanceModalProps {
  wallet: {
    id: string;
    name: string;
    balance: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function AdjustBalanceModal({
  wallet,
  isOpen,
  onClose,
}: AdjustBalanceModalProps) {
  const [newBalance, setNewBalance] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedNewBalance = parseFloat(newBalance);
  const hasValidValue = !isNaN(parsedNewBalance);
  const diff = hasValidValue ? Number((parsedNewBalance - wallet.balance).toFixed(2)) : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasValidValue) {
      setError("Por favor ingresa una cantidad válida.");
      return;
    }

    if (diff === 0) {
      setError("El nuevo saldo es idéntico al actual. No hay diferencia que ajustar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("walletId", wallet.id);
      formData.set("newBalance", parsedNewBalance.toString());
      if (reason.trim()) {
        formData.set("reason", reason.trim());
      }

      await adjustWalletBalance(formData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al ajustar el saldo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Ajustar Saldo</h3>
            <p className="text-xs text-slate-500 mt-0.5">Conciliación de {wallet.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Saldo en App
              </p>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">
                ${wallet.balance.toFixed(2)}
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Registrado
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Saldo real observado hoy ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              value={newBalance}
              onChange={(e) => {
                setNewBalance(e.target.value);
                setError(null);
              }}
              placeholder={`Ej. ${(wallet.balance + 100).toFixed(2)}`}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Previsualización del Ajuste */}
          {hasValidValue && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium transition-all ${
                diff > 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : diff < 0
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold">Diferencia calculada:</span>
                <span className="font-black text-sm">
                  {diff > 0 ? `+` : ""}${diff.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] opacity-90">
                {diff > 0
                  ? "Se creará un movimiento de INGRESO para reflejar este excedente."
                  : diff < 0
                  ? "Se creará un movimiento de GASTO para descontar este faltante."
                  : "El saldo es igual. No se requiere ningún movimiento."}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo o nota (Opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Revisión quincenal, arqueo de efectivo..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 px-4 rounded-xl border border-gray-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !hasValidValue || diff === 0}
              className="w-2/3 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all text-sm shadow-md active:scale-95"
            >
              {loading ? "Aplicando..." : "Confirmar Ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
