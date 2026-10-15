"use client";

import { useState } from "react";
import { deleteBudget, updateBudget } from "../actions/budget";
import TransactionForm from "./TransactionForm";

export type BudgetWithStats = {
  id: string;
  limitAmount: number;
  frequencyDays: number;
  startDate: Date | string;
  category: {
    id: string;
    name: string;
  };
  spent: number;
  cycleStart: Date;
  cycleEnd: Date;
  daysRemaining: number;
};

type Wallet = { id: string; name: string; balance: number };
type Category = { id: string; name: string; type: string };

export default function BudgetsSection({
  budgets,
  wallets = [],
  categories = [],
}: {
  budgets: BudgetWithStats[];
  wallets?: Wallet[];
  categories?: Category[];
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expenseBudget, setExpenseBudget] = useState<BudgetWithStats | null>(null);
  const [editBudget, setEditBudget] = useState<BudgetWithStats | null>(null);
  const [resetCycleChecked, setResetCycleChecked] = useState(false);
  const [selectedFreqDays, setSelectedFreqDays] = useState<number>(7);

  const openEditModal = (b: BudgetWithStats) => {
    setEditBudget(b);
    setSelectedFreqDays(b.frequencyDays);
    setResetCycleChecked(false);
  };

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-base font-medium text-slate-700">No tienes topes de gasto configurados.</p>
            <p className="text-xs text-slate-400 mt-1">
              Crea un presupuesto por categoría para mantener tus gastos bajo control.
            </p>
          </div>
        ) : (
          budgets.map((b) => {
            const percent = Math.min(100, Math.round((b.spent / b.limitAmount) * 100));
            const isOverLimit = b.spent > b.limitAmount;
            const overAmount = b.spent - b.limitAmount;
            const remainingAmount = Math.max(0, b.limitAmount - b.spent);

            // Colores de la barra según porcentaje
            let barColor = "bg-emerald-500";
            let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";

            if (isOverLimit || percent >= 85) {
              barColor = "bg-rose-500";
              badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
            } else if (percent >= 60) {
              barColor = "bg-amber-500";
              badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
            }

            return (
              <div
                key={b.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight">
                        {b.category.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Ciclo de {b.frequencyDays} días • {b.daysRemaining === 0 ? "Termina hoy" : `Quedan ${b.daysRemaining} días`}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}
                    >
                      {isOverLimit
                        ? `+${Math.round((b.spent / b.limitAmount) * 100)}% Excedido`
                        : `${percent}%`}
                    </span>
                  </div>

                  {/* Montos */}
                  <div className="flex justify-between items-baseline mt-4 mb-2">
                    <div>
                      <span className="text-2xl font-black text-slate-900">
                        ${b.spent.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5 font-medium">
                        gastados de ${b.limitAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 block">
                        {isOverLimit ? "Excedido por" : "Disponible"}
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          isOverLimit ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        ${(isOverLimit ? overAmount : remainingAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Acciones del tope de gasto */}
                <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-100 text-xs">
                  {/* Botón para hacer un gasto directo a este tope */}
                  <button
                    type="button"
                    onClick={() => setExpenseBudget(b)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-1.5 px-3 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span> Registrar Gasto
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Botón Editar que contiene el reseteo y ajuste completo */}
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Editar
                    </button>

                    <form
                      action={async (formData) => {
                        if (confirm(`¿Eliminar el tope de gasto para "${b.category.name}"?`)) {
                          setLoadingId(b.id);
                          await deleteBudget(formData);
                          setLoadingId(null);
                        }
                      }}
                    >
                      <input type="hidden" name="budgetId" value={b.id} />
                      <button
                        type="submit"
                        disabled={loadingId === b.id}
                        className="text-rose-500 hover:text-rose-700 font-semibold px-2 py-1 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Registrar Gasto Directo a este Tope */}
      {expenseBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Gasto en {expenseBudget.category.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Se computará directamente dentro de este tope de gasto.
                </p>
              </div>
              <button
                onClick={() => setExpenseBudget(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 cursor-pointer leading-none"
              >
                ✕
              </button>
            </div>

            <TransactionForm
              wallets={wallets}
              categories={categories}
              defaultType="EXPENSE"
              defaultCategoryId={expenseBudget.category.id}
              lockCategory={true}
              onSuccess={() => setExpenseBudget(null)}
            />
          </div>
        </div>
      )}

      {/* Modal: Editar Tope de Gasto & Reinicio de Ciclo */}
      {editBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Editar Tope de Gasto
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Categoría: <span className="font-bold text-slate-700">{editBudget.category.name}</span>
                </p>
              </div>
              <button
                onClick={() => setEditBudget(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 cursor-pointer leading-none"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                if (resetCycleChecked) {
                  const ok = confirm(
                    `¿Estás seguro de reiniciar el ciclo hoy para "${editBudget.category.name}"?\n\nEl contador de días y la ventana de gasto comenzarán desde cero a partir de este momento.`
                  );
                  if (!ok) return;
                }

                setLoadingId(editBudget.id);
                await updateBudget(formData);
                setLoadingId(null);
                setEditBudget(null);
              }}
              className="space-y-5"
            >
              <input type="hidden" name="budgetId" value={editBudget.id} />
              <input
                type="hidden"
                name="resetCycle"
                value={resetCycleChecked ? "true" : "false"}
              />

              {/* Límite de Gasto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Límite de Dinero ($)
                </label>
                <input
                  type="number"
                  name="limitAmount"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={editBudget.limitAmount}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Frecuencia del ciclo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duración del Ciclo (Días)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFreqDays(7)}
                    className={`py-2 px-2 text-xs rounded-xl font-bold border transition-all cursor-pointer ${
                      selectedFreqDays === 7
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Semanal (7d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFreqDays(15)}
                    className={`py-2 px-2 text-xs rounded-xl font-bold border transition-all cursor-pointer ${
                      selectedFreqDays === 15
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Quincenal (15d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFreqDays(30)}
                    className={`py-2 px-2 text-xs rounded-xl font-bold border transition-all cursor-pointer ${
                      selectedFreqDays === 30
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Mensual (30d)
                  </button>
                </div>
                <input
                  type="number"
                  name="frequencyDays"
                  min="1"
                  required
                  value={selectedFreqDays}
                  onChange={(e) => setSelectedFreqDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Opción de Reinicio de Ciclo con advertencia y confirmación */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetCycleChecked}
                    onChange={(e) => setResetCycleChecked(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                       Reiniciar ciclo a partir de hoy
                    </span>
                    <span className="text-xs text-slate-600 mt-0.5 block leading-relaxed">
                      Reinicia el contador de días a 0 hoy. Los gastos anteriores a hoy ya no se contarán dentro del nuevo ciclo. Se solicitará confirmación al guardar.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBudget(null)}
                  className="w-1/3 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingId === editBudget.id}
                  className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm cursor-pointer"
                >
                  {loadingId === editBudget.id ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
