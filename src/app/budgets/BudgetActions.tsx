"use client";

import { useState } from "react";
import BudgetForm from "../components/BudgetForm";

type Category = { id: string; name: string; type: string };

export default function BudgetActions({ categories }: { categories: Category[] }) {
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  return (
    <>
      <div>
        <button
          onClick={() => setShowBudgetModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Tope de Gasto
        </button>
      </div>

      {/* Modal Presupuesto */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Crear Tope de Gasto</h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <BudgetForm
              categories={categories}
              onSuccess={() => setShowBudgetModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
