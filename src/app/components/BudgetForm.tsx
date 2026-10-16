"use client";

import { useRef, useState } from "react";
import { createBudget } from "../actions/budget";
import { formatDateToInput } from "@/lib/date";

type Category = { id: string; name: string; type: string };

export default function BudgetForm({ 
  categories, 
  onSuccess 
}: { 
  categories: Category[]; 
  onSuccess?: () => void 
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(categories.length === 0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || "");
  const [frequencyDays, setFrequencyDays] = useState<string>("");
  const [limitAmount, setLimitAmount] = useState<string>("");

  const expenseCategories = categories.filter(c => c.type === "EXPENSE");

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setErrorMessage("");
        setLoading(true);
        try {
          await createBudget(formData);
          formRef.current?.reset();
          onSuccess?.();
        } catch (err: any) {
          setErrorMessage(err?.message || "Ocurrió un error al crear el tope de gasto.");
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

      {/* Selector o Creación de Categoría */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-slate-700">
            Categoría del Gasto
          </label>
          {expenseCategories.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsCreatingNewCategory(!isCreatingNewCategory);
                if (!isCreatingNewCategory) setSelectedCategoryId("");
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {isCreatingNewCategory ? "Elegir existente" : "+ Nueva categoría"}
            </button>
          )}
        </div>

        {isCreatingNewCategory || expenseCategories.length === 0 ? (
          <div>
            <input
              type="text"
              name="newCategoryName"
              required
              placeholder="Ej. Salidas con mi novia, Antojos, Café..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Se creará automáticamente esta categoría de gasto.
            </p>
          </div>
        ) : (
          <div>
            <select
              name="categoryId"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Monto Límite */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Límite Máximo de Gasto ($)
        </label>
        <input
          type="number"
          name="limitAmount"
          step="0.01"
          min="1"
          required
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
          placeholder="Ej. 600"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>

      {/* Frecuencia / Duración del Ciclo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Frecuencia del Tope (Días)
        </label>
        <input
          type="number"
          name="frequencyDays"
          min="1"
          value={frequencyDays}
          onChange={(e) => setFrequencyDays(e.target.value)}
          required
          placeholder="Ej. 7"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />

        {/* Botones de sugerencias rápidas de frecuencia */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: "Semanal (7d)", days: 7 },
            { label: "Quincenal (15d)", days: 15 },
            { label: "Mensual (30d)", days: 30 },
          ].map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setFrequencyDays(p.days.toString())}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                frequencyDays === p.days.toString()
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fecha de inicio del ciclo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Fecha de Inicio de este Ciclo
        </label>
        <input
          type="date"
          name="startDate"
          defaultValue={formatDateToInput()}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          A partir de esta fecha se sumarán las transacciones de esta categoría.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 mt-2 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
      >
        {loading ? "Creando..." : "Establecer Tope de Gasto"}
      </button>
    </form>
  );
}
