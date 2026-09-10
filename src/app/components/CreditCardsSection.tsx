"use client";

import { useState } from "react";
import { payCreditPurchaseMonth, deleteCreditPurchase, deleteCreditCard } from "../actions/creditCard";
import CreditPurchaseForm from "./CreditPurchaseForm";

export type CreditPurchaseItem = {
  id: string;
  description: string;
  totalAmount: number;
  totalMonths: number;
  paidMonths: number;
  monthlyPayment: number;
  isCompleted: boolean;
};

export type CreditCardWithPurchases = {
  id: string;
  name: string;
  cutoffDay: number | null;
  paymentDay: number | null;
  purchases: CreditPurchaseItem[];
};

export default function CreditCardsSection({
  creditCards,
}: {
  creditCards: CreditCardWithPurchases[];
}) {
  const [loadingPurchaseId, setLoadingPurchaseId] = useState<string | null>(null);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [selectedCardForPurchase, setSelectedCardForPurchase] = useState<CreditCardWithPurchases | null>(null);

  // Gran total a pagar este mes entre todas las tarjetas
  const totalMonthlyPaymentAll = creditCards.reduce((acc, card) => {
    const active = card.purchases.filter((p) => !p.isCompleted);
    return acc + active.reduce((sum, p) => sum + p.monthlyPayment, 0);
  }, 0);

  // Gran total de deuda restante acumulada
  const totalRemainingDebtAll = creditCards.reduce((acc, card) => {
    const active = card.purchases.filter((p) => !p.isCompleted);
    return (
      acc +
      active.reduce((sum, p) => {
        const remainingMonths = Math.max(0, p.totalMonths - p.paidMonths);
        return sum + remainingMonths * p.monthlyPayment;
      }, 0)
    );
  }, 0);

  return (
    <section className="mb-10">
      {/* Encabezado y Resumen Global */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800"> Tarjetas de Crédito y Meses Sin Intereses</h2>
          <p className="text-xs text-slate-500">
            Control de compras a plazos y pagos requeridos del mes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-purple-700 block uppercase tracking-wider">
              Total a Pagar este Mes
            </span>
            <span className="text-base font-black text-purple-900">
              ${Math.ceil(totalMonthlyPaymentAll).toLocaleString("es-MX")}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Deuda Total Restante
            </span>
            <span className="text-base font-black text-slate-700">
              ${Math.ceil(totalRemainingDebtAll).toLocaleString("es-MX")}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {creditCards.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-base font-medium text-slate-700">No tienes tarjetas de crédito registradas.</p>
            <p className="text-xs text-slate-400 mt-1">Registra tus tarjetas de crédito para controlar tus compras a meses sin intereses y fechas límite de pago.</p>
          </div>
        ) : (
          creditCards.map((card) => {
          const activePurchases = card.purchases.filter((p) => !p.isCompleted);
          const completedPurchases = card.purchases.filter((p) => p.isCompleted);

          const cardMonthlyTotal = activePurchases.reduce(
            (sum, p) => sum + p.monthlyPayment,
            0
          );
          const cardTotalRemaining = activePurchases.reduce((sum, p) => {
            const rem = Math.max(0, p.totalMonths - p.paidMonths);
            return sum + rem * p.monthlyPayment;
          }, 0);

          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Header de la Tarjeta */}
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-lg text-white tracking-wide">
                      {card.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                      {card.cutoffDay && (
                        <span>Corte: Día {card.cutoffDay}</span>
                      )}
                      {card.cutoffDay && card.paymentDay && <span>•</span>}
                      {card.paymentDay && (
                        <span className="font-semibold text-amber-300">
                          Pagar antes del {card.paymentDay}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-300 block font-medium">
                      Pagar este mes:
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      ${Math.ceil(cardMonthlyTotal).toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>

                {/* Sub-resumen */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
                  <span>
                    {activePurchases.length}{" "}
                    {activePurchases.length === 1 ? "compra activa" : "compras activas"}
                  </span>
                  <span>
                    Deuda total: ${Math.ceil(cardTotalRemaining).toLocaleString("es-MX")}
                  </span>
                </div>
              </div>

              {/* Lista de Compras dentro de la tarjeta */}
              <div className="p-5 space-y-4 flex-1">
                {activePurchases.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No tienes compras pendientes en esta tarjeta. ¡Estás al día! 
                  </div>
                ) : (
                  activePurchases.map((purchase) => {
                    const isMsi = purchase.totalMonths > 1;
                    const progressPercent = Math.min(
                      100,
                      Math.round((purchase.paidMonths / purchase.totalMonths) * 100)
                    );
                    const remainingMonths = Math.max(0, purchase.totalMonths - purchase.paidMonths);
                    const remainingAmount = remainingMonths * purchase.monthlyPayment;

                    return (
                      <div
                        key={purchase.id}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {purchase.description}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isMsi ? (
                                <span className="inline-block bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                  MSI: Mes {purchase.paidMonths} de {purchase.totalMonths}
                                </span>
                              ) : (
                                <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                  Pago de Contado
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                Restante: ${Math.ceil(remainingAmount).toLocaleString("es-MX")}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-500 block">
                              Cuota mes
                            </span>
                            <span className="text-base font-black text-slate-900">
                              ${Math.ceil(purchase.monthlyPayment).toLocaleString("es-MX")}
                            </span>
                          </div>
                        </div>

                        {/* Barra de progreso si son MSI */}
                        {isMsi && (
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-purple-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}

                        {/* Botones de acción para la compra */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                          <form
                            action={async (formData) => {
                              if (confirm(`¿Eliminar compra "${purchase.description}"?`)) {
                                setLoadingPurchaseId(purchase.id);
                                await deleteCreditPurchase(formData);
                                setLoadingPurchaseId(null);
                              }
                            }}
                          >
                            <input type="hidden" name="purchaseId" value={purchase.id} />
                            <button
                              type="submit"
                              disabled={loadingPurchaseId === purchase.id}
                              className="text-slate-400 hover:text-rose-600 font-semibold transition-colors disabled:opacity-50"
                            >
                              Eliminar
                            </button>
                          </form>

                          <form
                            action={async (formData) => {
                              const confirmMsg = isMsi
                                ? `¿Abonar mensualidad #${purchase.paidMonths + 1} de $${Math.ceil(purchase.monthlyPayment)} para "${purchase.description}"?`
                                : `¿Liquidar compra de $${Math.ceil(purchase.totalAmount)} para "${purchase.description}"?`;
                              
                              if (confirm(confirmMsg)) {
                                setLoadingPurchaseId(purchase.id);
                                await payCreditPurchaseMonth(formData);
                                setLoadingPurchaseId(null);
                              }
                            }}
                          >
                            <input type="hidden" name="purchaseId" value={purchase.id} />
                            <button
                              type="submit"
                              disabled={loadingPurchaseId === purchase.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                              {loadingPurchaseId === purchase.id
                                ? "Procesando..."
                                : isMsi
                                ? " Abonar Mes"
                                : " Liquidar"}
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Si hay compras completadas */}
                {completedPurchases.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1">
                     {completedPurchases.length}{" "}
                    {completedPurchases.length === 1 ? "compra ya liquidada" : "compras ya liquidadas"}.
                  </div>
                )}
              </div>

              {/* Footer de la Tarjeta con botón de agregar compra y eliminar tarjeta */}
              <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCardForPurchase(card)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  + Agregar Compra a {card.name}
                </button>

                <form
                  action={async (formData) => {
                    if (confirm(`¿Eliminar la tarjeta "${card.name}" y todo su historial?`)) {
                      setLoadingCardId(card.id);
                      await deleteCreditCard(formData);
                      setLoadingCardId(null);
                    }
                  }}
                >
                  <input type="hidden" name="creditCardId" value={card.id} />
                  <button
                    type="submit"
                    disabled={loadingCardId === card.id}
                    className="text-slate-400 hover:text-rose-600 font-semibold transition-colors disabled:opacity-50"
                  >
                    Eliminar Tarjeta
                  </button>
                </form>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Modal para registrar compra en tarjeta específica */}
      {selectedCardForPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedCardForPurchase(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 text-xl leading-none"
            >
              
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Nueva Compra en {selectedCardForPurchase.name}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Registra una compra de contado o a meses sin intereses.
            </p>

            <CreditPurchaseForm
              creditCards={creditCards.map((c) => ({ id: c.id, name: c.name }))}
              defaultCardId={selectedCardForPurchase.id}
              onSuccess={() => setSelectedCardForPurchase(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
