"use client";

import { useState } from "react";
import { 
  recordReceivablePayment, 
  adjustReceivableDebt, 
  forceAccrueReceivable,
  updateReceivable,
  deleteReceivable 
} from "../actions/receivable";
import { formatDateToInput, formatDateDisplay } from "@/lib/date";

type Wallet = { id: string; name: string; balance: number };

export type ReceivableMovement = {
  id: string;
  amount: number;
  type: "PAYMENT" | "CHARGE" | "ACCRUAL";
  notes?: string | null;
  date: Date | string;
  wallet?: { id: string; name: string } | null;
  createdAt?: Date | string;
};

export type Receivable = {
  id: string;
  debtorName: string;
  currentBalance: number;
  recurringAmount: number;
  frequencyType: string;
  frequencyDays: number;
  anchorDay: number | null;
  nextAccrualDate: Date;
  notes: string | null;
  movements?: ReceivableMovement[];
};

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ReceivablesSection({
  receivables,
  wallets,
}: {
  receivables: Receivable[];
  wallets: Wallet[];
}) {
  const [paymentModalRec, setPaymentModalRec] = useState<Receivable | null>(null);
  const [adjustModalRec, setAdjustModalRec] = useState<Receivable | null>(null);
  const [editModalRec, setEditModalRec] = useState<Receivable | null>(null);
  const [historyModalRec, setHistoryModalRec] = useState<Receivable | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTimestamp] = useState(() => Date.now());

  const totalReceivable = receivables.reduce((acc, r) => acc + r.currentBalance, 0);

  return (
    <section className="mb-10">
      {/* Encabezado y Total */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cuentas por Cobrar (Te Deben)</h2>
          <p className="text-sm text-slate-500">
            Total pendiente por cobrar: <span className="font-bold text-indigo-700">${totalReceivable.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {/* Grid de deudores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {receivables.map((rec) => {
          const nextAccrual = new Date(rec.nextAccrualDate);
          const daysLeft = Math.max(0, Math.ceil((nextAccrual.getTime() - currentTimestamp) / (1000 * 60 * 60 * 24)));
          
          let scheduleText = "";
          if (rec.frequencyType === "WEEKLY" && rec.anchorDay !== null) {
            scheduleText = `Cada ${DAY_NAMES[rec.anchorDay]}`;
          } else if (rec.frequencyType === "MONTHLY" && rec.anchorDay !== null) {
            scheduleText = `Día ${rec.anchorDay} de cada mes`;
          } else if (rec.frequencyType === "DAILY") {
            scheduleText = "Diario";
          } else {
            scheduleText = `Cada ${rec.frequencyDays} días`;
          }

          return (
            <div
              key={rec.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{rec.debtorName}</h3>
                    {rec.notes && <p className="text-xs text-slate-500">{rec.notes}</p>}
                  </div>
                  <form
                    action={async (formData) => {
                      if (confirm(`¿Eliminar la cuenta por cobrar de ${rec.debtorName}?`)) {
                        setLoading(true);
                        await deleteReceivable(formData);
                        setLoading(false);
                      }
                    }}
                  >
                    <input type="hidden" name="receivableId" value={rec.id} />
                    <button
                      type="submit"
                      title="Eliminar cuenta por cobrar"
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </form>
                </div>

                <div className="my-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Saldo que te deben</p>
                  <p className="text-3xl font-extrabold text-indigo-700">${rec.currentBalance.toFixed(2)}</p>
                </div>

                {rec.recurringAmount > 0 && (
                  <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-2xl mb-4 text-xs text-indigo-950">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-indigo-900 text-sm">
                        +${rec.recurringAmount.toFixed(2)}
                      </span>
                      <span className="bg-indigo-100/80 text-indigo-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        {scheduleText}
                      </span>
                    </div>
                    <p className="text-indigo-600 mt-1">
                      Próximo aumento: <span className="font-medium text-indigo-900">{formatDateDisplay(rec.nextAccrualDate)}</span> (en ~{daysLeft} días)
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de acción del deudor */}
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalRec(rec)}
                  className="flex-1 min-w-[110px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  Registrar Abono
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryModalRec(rec)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-2 px-2.5 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  title="Ver historial de abonos y aumentos"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustModalRec(rec)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-2 px-2.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                  title="Aumentar deuda manualmente si te piden prestado más"
                >
                  + Más Deuda
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalRec(rec)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-2 px-2.5 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  title="Editar configuración o eliminar cuenta por cobrar"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Editar
                </button>
              </div>
            </div>
          );
        })}

        {receivables.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl">
            <p className="text-base font-medium text-slate-700">No tienes cuentas por cobrar registradas.</p>
            <p className="text-xs text-slate-500 mt-1">
              Usa el botón &quot;+ Cuenta por Cobrar&quot; para anotar deudores con reglas de aumentos semanales o mensuales.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Editar Cuenta por Cobrar, Adelantar Corte y Eliminar */}
      {editModalRec && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Editar Cuenta por Cobrar</h3>
                <p className="text-xs text-slate-500">{editModalRec.debtorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sección especial: Adelantar Corte con Confirmación */}
              {editModalRec.recurringAmount > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-wider"> Adelantar Corte Manual</p>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Suma inmediatamente +${editModalRec.recurringAmount.toFixed(2)} al saldo adeudado.
                    </p>
                  </div>
                  <form
                    action={async (formData) => {
                      if (confirm(`¿Confirmas que deseas aplicar el corte de $${editModalRec.recurringAmount.toFixed(2)} ahora mismo a la deuda de ${editModalRec.debtorName}?`)) {
                        setLoading(true);
                        await forceAccrueReceivable(formData);
                        setLoading(false);
                        setEditModalRec(null);
                      }
                    }}
                  >
                    <input type="hidden" name="receivableId" value={editModalRec.id} />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      Sumar Corte Ahora
                    </button>
                  </form>
                </div>
              )}

              {/* Formulario de Edición de Campos */}
              <form
                action={async (formData) => {
                  setLoading(true);
                  await updateReceivable(formData);
                  setLoading(false);
                  setEditModalRec(null);
                }}
                className="space-y-4"
              >
                <input type="hidden" name="receivableId" value={editModalRec.id} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Deudor</label>
                  <input
                    type="text"
                    name="debtorName"
                    defaultValue={editModalRec.debtorName}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Adeudado Actual ($)</label>
                  <input
                    type="number"
                    name="currentBalance"
                    step="0.01"
                    defaultValue={editModalRec.currentBalance}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <p className="text-xs text-slate-400 mt-1">Puedes corregir el saldo manualmente si necesitas cuadrarlo.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Aumento Periódico ($)</label>
                    <input
                      type="number"
                      name="recurringAmount"
                      step="0.01"
                      min="0"
                      defaultValue={editModalRec.recurringAmount}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
                    <select
                      name="frequencyType"
                      defaultValue={editModalRec.frequencyType}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="WEEKLY">Semanal</option>
                      <option value="BIWEEKLY">Quincenal (cada 15 días)</option>
                      <option value="MONTHLY">Mensual</option>
                      <option value="CUSTOM">Personalizado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Próxima Fecha de Aumento (Corte)
                  </label>
                  <input
                    type="date"
                    name="nextAccrualDate"
                    defaultValue={formatDateToInput(editModalRec.nextAccrualDate)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Cambia esta fecha si necesitas reprogramar el próximo día de corte.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={editModalRec.notes || ""}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </form>

              {/* Zona de Peligro: Eliminar Cuenta por Cobrar al darle a editar */}
              <div className="pt-5 border-t border-red-100">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (
                      confirm(
                        `¿Estás seguro de que deseas eliminar permanentemente la cuenta por cobrar de "${editModalRec.debtorName}"?\n\nEsta acción borrará también todo su historial de abonos y cortes.`
                      )
                    ) {
                      setLoading(true);
                      const formData = new FormData();
                      formData.set("receivableId", editModalRec.id);
                      await deleteReceivable(formData);
                      setLoading(false);
                      setEditModalRec(null);
                    }
                  }}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-3.5 px-4 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <svg
                    className="w-4 h-4 text-rose-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Eliminar Cuenta por Cobrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historial de la Cuenta por Cobrar */}
      {historyModalRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Historial de {historyModalRec.debtorName}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs flex-wrap">
                  <span className="text-slate-500">
                    Saldo adeudado:{" "}
                    <strong className="text-indigo-700 font-bold">
                      ${historyModalRec.currentBalance.toFixed(2)}
                    </strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">
                    Total abonado:{" "}
                    <strong className="text-emerald-700 font-bold">
                      ${(historyModalRec.movements || [])
                        .filter((m) => m.type === "PAYMENT")
                        .reduce((sum, m) => sum + m.amount, 0)
                        .toFixed(2)}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4 space-y-2.5 pr-1">
              {(() => {
                const movements = historyModalRec.movements || [];

                if (movements.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-500">
                      <p className="text-sm font-medium text-slate-700">
                        No hay movimientos registrados para este deudor.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Los abonos recibidos, aumentos de deuda y cortes programados aparecerán aquí.
                      </p>
                    </div>
                  );
                }

                return movements.map((m) => {
                  const isPayment = m.type === "PAYMENT";
                  const isAccrual = m.type === "ACCRUAL";
                  const isCharge = m.type === "CHARGE";

                  let typeLabel = "Movimiento";
                  let badgeClass = "bg-slate-100 text-slate-700";
                  if (isPayment) {
                    typeLabel = "Abono Recibido";
                    badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
                  } else if (isAccrual) {
                    typeLabel = "Corte Programado";
                    badgeClass = "bg-purple-50 text-purple-700 border border-purple-200/60";
                  } else if (isCharge) {
                    typeLabel = "Aumento de Deuda";
                    badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-200/60";
                  }

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between transition-colors"
                    >
                      <div className="pr-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {typeLabel}
                          </span>
                          {isPayment && m.wallet && (
                            <span className="text-[10px] font-medium text-slate-500">
                              En: <strong className="text-slate-700">{m.wallet.name}</strong>
                            </span>
                          )}
                        </div>
                        {m.notes && (
                          <p className="font-semibold text-slate-800 text-xs sm:text-sm mt-1 truncate">
                            {m.notes}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDateDisplay(m.date)}
                        </p>
                      </div>

                      <div
                        className={`text-sm sm:text-base font-extrabold whitespace-nowrap text-right ${
                          isPayment ? "text-emerald-600" : "text-indigo-700"
                        }`}
                      >
                        {isPayment ? "-" : "+"}${m.amount.toFixed(2)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-4 mt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalRec(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Abono */}
      {paymentModalRec && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Registrar Abono</h3>
                <p className="text-xs text-slate-500">Deudor: {paymentModalRec.debtorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              action={async (formData) => {
                setLoading(true);
                await recordReceivablePayment(formData);
                setLoading(false);
                setPaymentModalRec(null);
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="receivableId" value={paymentModalRec.id} />

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <span className="text-slate-500">Saldo actual adeudado:</span>{" "}
                <span className="font-bold text-slate-900">${paymentModalRec.currentBalance.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ¿A qué cuenta entró el dinero?
                </label>
                <select
                  name="walletId"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (${w.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto del Abono ($)</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  max={paymentModalRec.currentBalance > 0 ? paymentModalRec.currentBalance : undefined}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción del Ingreso</label>
                <input
                  type="text"
                  name="notes"
                  placeholder={`Abono de ${paymentModalRec.debtorName}`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading || wallets.length === 0}
                className="w-full bg-emerald-600 text-white px-8 py-4 mt-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {loading ? "Aplicando..." : "Aplicar Abono e Ingresar a Billetera"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aumento manual de deuda */}
      {adjustModalRec && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Aumentar Deuda</h3>
                <p className="text-xs text-slate-500">Deudor: {adjustModalRec.debtorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              action={async (formData) => {
                setLoading(true);
                await adjustReceivableDebt(formData);
                setLoading(false);
                setAdjustModalRec(null);
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="receivableId" value={adjustModalRec.id} />

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <span className="text-slate-500">Saldo actual adeudado:</span>{" "}
                <span className="font-bold text-slate-900">${adjustModalRec.currentBalance.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto a sumar a la deuda ($)</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Úsalo si te pidieron más dinero prestado o si quieres sumar un cargo manual.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Notas (Opcional)</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Préstamo adicional, cargo, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white px-8 py-4 mt-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {loading ? "Sumando..." : "Sumar a la Deuda"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
