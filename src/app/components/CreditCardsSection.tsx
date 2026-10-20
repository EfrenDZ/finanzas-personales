"use client";

import { useState } from "react";
import { payCreditPurchaseMonth, deleteCreditPurchase, deleteCreditCard, payCreditCard } from "../actions/creditCard";
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
  wallet?: { id: string; name: string; balance: number } | null;
};

type LiquidWallet = { id: string; name: string; balance: number };

export default function CreditCardsSection({
  creditCards,
  liquidWallets = [],
}: {
  creditCards: CreditCardWithPurchases[];
  liquidWallets?: LiquidWallet[];
}) {
  const [loadingPurchaseId, setLoadingPurchaseId] = useState<string | null>(null);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [selectedCardForPurchase, setSelectedCardForPurchase] = useState<CreditCardWithPurchases | null>(null);
  const [payingCard, setPayingCard] = useState<CreditCardWithPurchases | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Gran total de gastos corrientes (deuda revolvente en tarjetas)
  const totalRevolvingDebtAll = creditCards.reduce((acc, card) => {
    return acc + (card.wallet ? Math.max(0, -card.wallet.balance) : 0);
  }, 0);

  // Gran total de MSI a pagar este mes
  const totalMsiMonthlyAll = creditCards.reduce((acc, card) => {
    const active = card.purchases.filter((p) => !p.isCompleted);
    return acc + active.reduce((sum, p) => sum + p.monthlyPayment, 0);
  }, 0);

  // Total combinado requerido este mes (Gastos corrientes + Mensualidades MSI)
  const totalMonthlyPaymentAll = totalRevolvingDebtAll + totalMsiMonthlyAll;

  // Gran total de deuda restante acumulada (MSI restantes + gastos corrientes)
  const totalRemainingDebtAll = creditCards.reduce((acc, card) => {
    const active = card.purchases.filter((p) => !p.isCompleted);
    const msiRemaining = active.reduce((sum, p) => {
      const remainingMonths = Math.max(0, p.totalMonths - p.paidMonths);
      return sum + remainingMonths * p.monthlyPayment;
    }, 0);
    const cardRevolving = card.wallet ? Math.max(0, -card.wallet.balance) : 0;
    return acc + msiRemaining + cardRevolving;
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

          const cardMsiMonthly = activePurchases.reduce(
            (sum, p) => sum + p.monthlyPayment,
            0
          );
          const cardRevolvingDebt = card.wallet ? Math.max(0, -card.wallet.balance) : 0;
          const cardTotalDueMonth = cardMsiMonthly + cardRevolvingDebt;

          const cardTotalRemaining = activePurchases.reduce((sum, p) => {
            const rem = Math.max(0, p.totalMonths - p.paidMonths);
            return sum + rem * p.monthlyPayment;
          }, 0) + cardRevolvingDebt;

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
                      ${Math.ceil(cardTotalDueMonth).toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>

                {/* Sub-resumen con desglose de deuda */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <span>Gastos: ${Math.ceil(cardRevolvingDebt).toLocaleString("es-MX")}</span>
                    {cardMsiMonthly > 0 && <span>• MSI: ${Math.ceil(cardMsiMonthly).toLocaleString("es-MX")}</span>}
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

              {/* Footer de la Tarjeta con botón de agregar compra, pagar tarjeta y eliminar tarjeta */}
              <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedCardForPurchase(card)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 text-xs cursor-pointer"
                  >
                    + Compra
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayingCard(card)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 text-xs flex items-center gap-1 cursor-pointer"
                    title="Transferir desde una cuenta de débito para abonar o liquidar"
                  >
                    💳 Pagar Tarjeta
                  </button>
                </div>

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
                    className="text-slate-400 hover:text-rose-600 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
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
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 text-xl leading-none cursor-pointer"
            >
              ✕
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

      {/* Modal para Pagar Tarjeta de Crédito (Transferencia desde Débito) */}
      {payingCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setPayingCard(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 text-xl leading-none cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Pagar {payingCard.name}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Transfiere dinero desde una de tus cuentas de débito o efectivo para liquidar tu tarjeta.
            </p>

            {liquidWallets.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                No tienes cuentas de débito o efectivo registradas para realizar el pago. Agrega una primero en la sección de Cuentas.
              </div>
            ) : (
              <form
                action={async (formData) => {
                  setIsPaying(true);
                  try {
                    await payCreditCard(formData);
                    setPayingCard(null);
                  } catch (err: any) {
                    alert(err?.message || "Ocurrió un error al procesar el pago.");
                  } finally {
                    setIsPaying(false);
                  }
                }}
                className="space-y-4"
              >
                <input type="hidden" name="creditCardId" value={payingCard.id} />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cuenta Origen (Sale el dinero):
                  </label>
                  <select
                    name="fromWalletId"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  >
                    {liquidWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (${w.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto a Transferir / Pagar ($):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="amount"
                    required
                    defaultValue={
                      payingCard.wallet && payingCard.wallet.balance < 0
                        ? Math.abs(payingCard.wallet.balance).toFixed(2)
                        : "0.00"
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {payingCard.wallet && payingCard.wallet.balance < 0
                      ? `Deuda corriente actual: $${Math.abs(payingCard.wallet.balance).toFixed(2)}`
                      : "Tarjeta sin deuda corriente"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Concepto / Nota (opcional):
                  </label>
                  <input
                    type="text"
                    name="notes"
                    placeholder={`Pago a ${payingCard.name}`}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm cursor-pointer mt-2"
                >
                  {isPaying ? "Procesando pago..." : "Confirmar Pago (Transferencia)"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
