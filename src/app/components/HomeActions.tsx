"use client";

import { useState, useEffect } from "react";
import TransactionForm from "./TransactionForm";
import WalletForm from "./WalletForm";

type Wallet = { id: string; name: string; balance: number };
type Category = { id: string; name: string; type: string };

export default function HomeActions({
  wallets,
  categories = [],
}: {
  wallets: Wallet[];
  categories?: Category[];
}) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTransactionModal(false);
        setShowWalletModal(false);
      }
    };
    if (showTransactionModal || showWalletModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showTransactionModal, showWalletModal]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <button
          onClick={() => setShowTransactionModal(true)}
          className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md shadow-blue-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Registrar Movimiento</span>
        </button>

        <button
          onClick={() => setShowWalletModal(true)}
          className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-5 rounded-2xl shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Nueva Cuenta</span>
        </button>
      </div>

      {/* Modal Movimiento */}
      {showTransactionModal && (
        <div
          onClick={() => setShowTransactionModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Registrar Movimiento</h3>
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TransactionForm
              wallets={wallets}
              categories={categories}
              onSuccess={() => setShowTransactionModal(false)}
              onOpenWalletModal={() => {
                setShowTransactionModal(false);
                setShowWalletModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Cuenta */}
      {showWalletModal && (
        <div
          onClick={() => setShowWalletModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Nueva Cuenta</h3>
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <WalletForm onSuccess={() => setShowWalletModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}
