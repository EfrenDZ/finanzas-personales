"use client";

import { useRef, useState } from "react";
import { createWallet } from "../actions/wallet";

export default function WalletForm({ onSuccess }: { onSuccess?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<"DEBIT" | "CASH" | "CREDIT">("DEBIT");

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setLoading(true);
        await createWallet(formData);
        formRef.current?.reset();
        setLoading(false);
        onSuccess?.();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cuenta</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setAccountType("DEBIT")}
            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              accountType === "DEBIT"
                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            🏦 Débito/Banco
          </button>
          <button
            type="button"
            onClick={() => setAccountType("CASH")}
            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              accountType === "CASH"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            💵 Efectivo
          </button>
          <button
            type="button"
            onClick={() => setAccountType("CREDIT")}
            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              accountType === "CREDIT"
                ? "bg-purple-50 border-purple-500 text-purple-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            💳 TdC / Crédito
          </button>
        </div>
        <input type="hidden" name="type" value={accountType} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {accountType === "CREDIT" ? "Nombre de la Tarjeta (Ej. Nu, Banamex)" : "Nombre de la Cuenta (Ej. BBVA, Efectivo)"}
        </label>
        <input 
          type="text" 
          name="name" 
          required 
          placeholder={accountType === "CREDIT" ? "Ej. Nu Tarjeta de Crédito" : "Ej. BBVA Nómina"} 
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder-slate-400 font-medium text-sm" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {accountType === "CREDIT" ? "Saldo Deudor Inicial ($)" : "Saldo Inicial ($)"}
        </label>
        <input 
          type="number" 
          name="initialBalance" 
          step="0.01" 
          min="0" 
          required 
          defaultValue="0" 
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium text-sm" 
        />
        {accountType === "CREDIT" && (
          <p className="text-[11px] text-slate-400 mt-1">Si ya tienes deuda acumulada en la tarjeta, colócala aquí (o deja 0 si está al día).</p>
        )}
      </div>

      {accountType === "CREDIT" && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Límite de Crédito Total ($)
            </label>
            <input 
              type="number" 
              name="creditLimit" 
              step="0.01" 
              min="0" 
              placeholder="Ej. 20000" 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium text-sm" 
            />
            <p className="text-[11px] text-slate-400 mt-1">Línea de crédito autorizada por el banco.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Día de Corte (opcional)
            </label>
            <input
              type="number"
              name="cutoffDay"
              min="1"
              max="31"
              placeholder="Ej. 15"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Día Límite de Pago (opcional)
            </label>
            <input
              type="number"
              name="paymentDay"
              min="1"
              max="31"
              placeholder="Ej. 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
            />
          </div>
        </div>
      </>
    )}
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-slate-900 text-white px-8 py-3.5 mt-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-md text-sm cursor-pointer"
      >
        {loading ? "Guardando..." : accountType === "CREDIT" ? "Registrar Tarjeta de Crédito" : "Crear Cuenta"}
      </button>
    </form>
  );
}
