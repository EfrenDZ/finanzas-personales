"use client";

import { useRef, useState } from "react";
import { createWallet } from "../actions/wallet";

export default function WalletForm({ onSuccess }: { onSuccess?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

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
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre (Ej. Efectivo, Nu, BBVA)</label>
        <input 
          type="text" 
          name="name" 
          required 
          placeholder="Nombre de la cuenta" 
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder-slate-400 font-medium" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Inicial ($)</label>
        <input 
          type="number" 
          name="initialBalance" 
          step="0.01" 
          min="0" 
          required 
          defaultValue="0" 
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium" 
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-slate-900 text-white px-8 py-4 mt-6 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-md"
      >
        {loading ? "Guardando..." : "Crear Billetera"}
      </button>
    </form>
  );
}
