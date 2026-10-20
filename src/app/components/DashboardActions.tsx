"use client";

import { useState } from "react";
import WalletForm from "./WalletForm";
import TransactionForm from "./TransactionForm";
import ReceivableForm from "./ReceivableForm";
import SinkingFundForm from "./SinkingFundForm";
import BudgetForm from "./BudgetForm";
import CreditCardForm from "./CreditCardForm";
import CreditPurchaseForm from "./CreditPurchaseForm";

type Wallet = { id: string; name: string; balance: number; type?: "DEBIT" | "CREDIT" | "CASH" };
type Category = { id: string; name: string; type: string };
type CreditCardItem = { id: string; name: string };

export default function DashboardActions({ 
  wallets, 
  categories = [],
  creditCards = []
}: { 
  wallets: Wallet[]; 
  categories?: Category[]; 
  creditCards?: CreditCardItem[];
}) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const [showCreditPurchaseModal, setShowCreditPurchaseModal] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 mb-8">
        <button 
          onClick={() => setShowTransactionModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-2 rounded-2xl shadow-md shadow-blue-200 transition-all active:scale-95 text-xs flex items-center justify-center gap-1"
        >
          <span>+</span> Movimiento
        </button>

        <button 
          onClick={() => setShowWalletModal(true)}
          className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3 px-2 rounded-2xl transition-all active:scale-95 text-xs flex items-center justify-center gap-1"
        >
          <span>+</span> Cuenta
        </button>

        <button 
          onClick={() => setShowReceivableModal(true)}
          className="bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-300 text-indigo-700 font-bold py-3 px-2 rounded-2xl transition-all active:scale-95 text-xs flex items-center justify-center gap-1"
        >
          <span>+</span> Por Cobrar
        </button>

        <button 
          onClick={() => setShowFundModal(true)}
          className="bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-800 font-bold py-3 px-2 rounded-2xl transition-all active:scale-95 text-xs flex items-center justify-center gap-1"
        >
          <span>+</span> Apartado
        </button>

        <button 
          onClick={() => setShowBudgetModal(true)}
          className="bg-amber-50 border-2 border-amber-200 hover:border-amber-300 text-amber-800 font-bold py-3 px-2 rounded-2xl transition-all active:scale-95 text-xs flex items-center justify-center gap-1"
        >
          <span>+</span> Tope Gasto
        </button>

        <button 
          onClick={() => setShowCreditCardModal(true)}
          className="bg-purple-50 border-2 border-purple-200 hover:border-purple-300 text-purple-800 font-bold py-3 px-2 rounded-2xl transition-all active:scale-95 text-xs flex items-center justify-center gap-1"
        >
          <span>+</span> Tarjeta
        </button>

        <button 
          onClick={() => {
            if (creditCards.length === 0) {
              setShowCreditCardModal(true);
            } else {
              setShowCreditPurchaseModal(true);
            }
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-2 rounded-2xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1 col-span-2 sm:col-span-1"
        >
          <span>+</span> A Crédito
        </button>
      </div>

      {/* Modal Movimiento */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-slate-900">Registrar Movimiento</h3>
              <button onClick={() => setShowTransactionModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <TransactionForm wallets={wallets} categories={categories} onSuccess={() => setShowTransactionModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Billetera */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-slate-900">Agregar Cuenta</h3>
              <button onClick={() => setShowWalletModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <WalletForm onSuccess={() => setShowWalletModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Cuenta por Cobrar */}
      {showReceivableModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">Nueva Cuenta por Cobrar</h3>
              <button onClick={() => setShowReceivableModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <ReceivableForm onSuccess={() => setShowReceivableModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Apartado de Reserva */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Apartado / Fondo</h3>
              <button onClick={() => setShowFundModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <SinkingFundForm onSuccess={() => setShowFundModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Tope de Gasto */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Tope de Gasto</h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <BudgetForm categories={categories} onSuccess={() => setShowBudgetModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Tarjeta / Deuda */}
      {showCreditCardModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">Nueva Tarjeta o Deuda</h3>
              <button onClick={() => setShowCreditCardModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <CreditCardForm onSuccess={() => setShowCreditCardModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Compra a Crédito */}
      {showCreditPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">Nueva Compra a Crédito / MSI</h3>
              <button onClick={() => setShowCreditPurchaseModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1">
                ✕
              </button>
            </div>
            <div className="p-6">
              <CreditPurchaseForm 
                creditCards={creditCards} 
                onSuccess={() => setShowCreditPurchaseModal(false)} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
