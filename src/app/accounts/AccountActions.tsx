"use client";

import { useState } from "react";
import WalletForm from "../components/WalletForm";
import ReceivableForm from "../components/ReceivableForm";

export default function AccountActions() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={() => setShowWalletModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>+</span> Nueva Cuenta
        </button>

        <button
          onClick={() => setShowReceivableModal(true)}
          className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>+</span> Por Cobrar
        </button>
      </div>

      {/* Modal Cuenta */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Agregar Nueva Cuenta</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <WalletForm onSuccess={() => setShowWalletModal(false)} />
          </div>
        </div>
      )}

      {/* Modal Por Cobrar */}
      {showReceivableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Nueva Cuenta por Cobrar</h3>
              <button
                onClick={() => setShowReceivableModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <ReceivableForm onSuccess={() => setShowReceivableModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}
