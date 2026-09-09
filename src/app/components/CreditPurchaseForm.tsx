"use client";

import { useRef, useState } from "react";
import { createCreditPurchase } from "../actions/creditCard";

type CreditCardItem = {
  id: string;
  name: string;
};

export default function CreditPurchaseForm({
  creditCards,
  defaultCardId,
  onSuccess,
}: {
  creditCards: CreditCardItem[];
  defaultCardId?: string;
  onSuccess?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [creditCardId, setCreditCardId] = useState(defaultCardId || creditCards[0]?.id || "");
  const [totalAmount, setTotalAmount] = useState("");
  const [isMSI, setIsMSI] = useState(false);
  const [totalMonths, setTotalMonths] = useState<number>(6);

  const parsedAmount = parseFloat(totalAmount) || 0;
  const computedMonths = isMSI ? Math.max(totalMonths, 1) : 1;
  const monthlyCalc = parsedAmount > 0 ? Math.ceil(parsedAmount / computedMonths) : 0;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setErrorMessage("");
        setLoading(true);
        try {
          await createCreditPurchase(formData);
          formRef.current?.reset();
          onSuccess?.();
        } catch (err: any) {
          setErrorMessage(err?.message || "Ocurrió un error al registrar la compra.");
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

      {/* Selector de Tarjeta */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tarjeta / Cuenta de Crédito
        </label>
        <select
          name="creditCardId"
          value={creditCardId}
          onChange={(e) => setCreditCardId(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          {creditCards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Concepto / Descripción */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          ¿Qué compraste o qué deuda es?
        </label>
        <input
          type="text"
          name="description"
          required
          placeholder="Ej. Laptop para el trabajo, Vuelo, Cena..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>

      {/* Monto Total */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Monto Total ($)
        </label>
        <input
          type="number"
          name="totalAmount"
          step="0.01"
          min="1"
          required
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="Ej. 12000"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>

      {/* Tipo: Pago de contado / revolvente vs Meses Sin Intereses */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Modalidad de Pago
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsMSI(false)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              !isMSI
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Pago del Mes (1 solo pago)
          </button>
          <button
            type="button"
            onClick={() => setIsMSI(true)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              isMSI
                ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Meses Sin Intereses (MSI)
          </button>
        </div>
      </div>

      <input type="hidden" name="totalMonths" value={isMSI ? totalMonths : 1} />

      {/* Opciones de MSI si está seleccionado */}
      {isMSI && (
        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-3">
          <label className="block text-xs font-bold text-purple-900">
            Plazo a Meses Sin Intereses
          </label>
          <div className="flex flex-wrap gap-2">
            {[3, 6, 9, 12, 18, 24].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTotalMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  totalMonths === m
                    ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                    : "bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs font-semibold text-purple-900">
            <span>Mensualidad estimada:</span>
            <span className="text-base font-black text-purple-700">
              ${monthlyCalc.toLocaleString("es-MX")} / mes
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || creditCards.length === 0}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 mt-2 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
      >
        {loading ? "Registrando..." : "Registrar Compra"}
      </button>
    </form>
  );
}
