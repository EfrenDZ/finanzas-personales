"use client";

import { useRef, useState } from "react";
import { createCreditCard } from "../actions/creditCard";

export default function CreditCardForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setErrorMessage("");
        setLoading(true);
        try {
          await createCreditCard(formData);
          formRef.current?.reset();
          onSuccess?.();
        } catch (err: any) {
          setErrorMessage(err?.message || "Ocurrió un error al registrar la tarjeta.");
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-4"
    >
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nombre de la Tarjeta o Deuda
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="Ej. Nu, Banamex Clásica, Préstamo Personal..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>

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
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
        <p className="text-[11px] text-slate-400 mt-1">Línea de crédito autorizada por el banco.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Día de Corte (opcional)
          </label>
          <input
            type="number"
            name="cutoffDay"
            min="1"
            max="31"
            placeholder="Ej. 15"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">Día del mes que cierra tu cuenta.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Día Límite Pago (opcional)
          </label>
          <input
            type="number"
            name="paymentDay"
            min="1"
            max="31"
            placeholder="Ej. 5"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">Fecha máxima para pagar.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 mt-2 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear Tarjeta / Deuda"}
      </button>
    </form>
  );
}
