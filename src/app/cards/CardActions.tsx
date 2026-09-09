"use client";

import { useState } from "react";
import CreditCardForm from "../components/CreditCardForm";
import CreditPurchaseForm from "../components/CreditPurchaseForm";

interface CardActionsProps {
  creditCards: { id: string; name: string }[];
}

export default function CardActions({ creditCards }: CardActionsProps) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={() => setShowCardModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>+</span> Nueva Tarjeta
        </button>

        <button
          onClick={() => {
            if (creditCards.length === 0) {
              setShowCardModal(true);
            } else {
              setShowPurchaseModal(true);
            }
          }}
          className="bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-800 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-xs sm:text-sm flex items-center gap-1.5"
        >
          <span>+</span> Compra a Crédito
        </button>
      </div>

      {/* Modal Tarjeta */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Agregar Tarjeta de Crédito</h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <CreditCardForm onSuccess={() => setShowCardModal(false)} />
          </div>
        </div>
      )}

      {/* Modal Compra a Crédito */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Registrar Compra a Crédito</h3>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>
            <CreditPurchaseForm
              creditCards={creditCards}
              onSuccess={() => setShowPurchaseModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
