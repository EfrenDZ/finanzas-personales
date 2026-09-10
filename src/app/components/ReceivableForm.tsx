"use client";

import { useRef, useState } from "react";
import { createReceivable } from "../actions/receivable";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ReceivableForm({ onSuccess }: { onSuccess?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [hasRecurring, setHasRecurring] = useState(true);
  const [frequencyType, setFrequencyType] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM">("WEEKLY");
  const [customDays, setCustomDays] = useState<number>(7);
  
  // Por defecto la fecha de hoy
  const [firstAccrualDate, setFirstAccrualDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Calcular texto explicativo a partir de la fecha elegida
  const selectedDateObj = firstAccrualDate ? new Date(`${firstAccrualDate}T12:00:00`) : new Date();
  const dayOfWeekName = DAY_NAMES[selectedDateObj.getDay()];
  const dayOfMonth = selectedDateObj.getDate();

  let explanationText = "";
  if (frequencyType === "WEEKLY") {
    explanationText = `Se sumará automáticamente cada ${dayOfWeekName} a partir de esa fecha.`;
  } else if (frequencyType === "BIWEEKLY") {
    explanationText = `Se sumará automáticamente cada 15 días a partir de esa fecha.`;
  } else if (frequencyType === "MONTHLY") {
    explanationText = `Se sumará automáticamente el día ${dayOfMonth} de cada mes.`;
  } else {
    explanationText = `Se sumará automáticamente cada ${customDays} días a partir de esa fecha.`;
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setLoading(true);
        await createReceivable(formData);
        formRef.current?.reset();
        setLoading(false);
        onSuccess?.();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          ¿Quién te debe? (Persona, Trabajo, Empresa)
        </label>
        <input
          type="text"
          name="debtorName"
          required
          placeholder="Ej. Mi trabajo, Juan Pérez..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Saldo que te debe HOY ($)
        </label>
        <input
          type="number"
          name="initialBalance"
          step="0.01"
          min="0"
          defaultValue="0"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
      </div>

      {/* Switch / Toggle para Aumento Recurrente */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="pr-4">
          <p className="text-sm font-bold text-slate-800">¿Tiene aumento recurrente?</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Actívalo si la deuda o ingreso aumenta periódicamente (ej. tu salario semanal o mensual).
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hasRecurring}
          onClick={() => setHasRecurring(!hasRecurring)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            hasRecurring ? "bg-indigo-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              hasRecurring ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {hasRecurring ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ¿Cuánto se le suma periódicamente? ($)
            </label>
            <input
              type="number"
              name="recurringAmount"
              step="0.01"
              min="0.01"
              defaultValue="2900"
              required={hasRecurring}
              placeholder="Ej. 2900"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
            />
          </div>

          {/* Frecuencia */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "WEEKLY", label: "Semanal" },
                { id: "BIWEEKLY", label: "Quincenal" },
                { id: "MONTHLY", label: "Mensual" },
                { id: "CUSTOM", label: "Cada N días" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFrequencyType(item.id as any)}
                  className={`py-2.5 px-2 rounded-xl font-semibold text-xs transition-all border text-center ${
                    frequencyType === item.id
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="frequencyType" value={frequencyType} />
          </div>

          {frequencyType === "CUSTOM" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Número de días entre cada aumento:
              </label>
              <input
                type="number"
                name="customDays"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          )}

          {/* Fecha en calendario */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha de corte inicial en el calendario:
            </label>
            <input
              type="date"
              name="firstAccrualDate"
              value={firstAccrualDate}
              onChange={(e) => setFirstAccrualDate(e.target.value)}
              required={hasRecurring}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
               {explanationText}
            </div>
          </div>
        </div>
      ) : (
        <input type="hidden" name="recurringAmount" value="0" />
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
        <input
          type="text"
          name="notes"
          placeholder="Ej. Préstamo personal sin aumento, salario acumulable..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white px-8 py-4 mt-2 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
      >
        {loading ? "Guardando..." : "Crear Cuenta por Cobrar"}
      </button>
    </form>
  );
}
