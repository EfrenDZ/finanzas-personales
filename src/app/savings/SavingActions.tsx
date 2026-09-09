"use client";

import { useState } from "react";
import SinkingFundForm from "../components/SinkingFundForm";

export default function SavingActions() {
  const [modalType, setModalType] = useState<"fund" | "goal" | null>(null);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setModalType("fund")}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Apartado
        </button>
        <button
          onClick={() => setModalType("goal")}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>🎯</span> Nueva Meta
        </button>
      </div>

      {/* Modal Apartado / Meta */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">
                {modalType === "goal" ? "Crear Meta a Futuro" : "Crear Apartado de Reserva"}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <SinkingFundForm 
              defaultIsOneOff={modalType === "goal"} 
              onSuccess={() => setModalType(null)} 
            />
          </div>
        </div>
      )}
    </>
  );
}
