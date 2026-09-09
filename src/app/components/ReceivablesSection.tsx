"use client";

import { useState } from "react";
import { 
  recordReceivablePayment, 
  adjustReceivableDebt, 
  forceAccrueReceivable,
  updateReceivable,
  deleteReceivable 
} from "../actions/receivable";

type Wallet = { id: string; name: string; balance: number };
type Receivable = {
  id: string;
  debtorName: string;
  currentBalance: number;
  recurringAmount: number;
  frequencyType: string;
  frequencyDays: number;
  anchorDay: number | null;
  nextAccrualDate: Date;
  notes: string | null;
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
  const [loading, setLoading] = useState(false);

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
          const daysLeft = Math.max(0, Math.ceil((nextAccrual.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          
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
                        await deleteReceivable(formData);
                      }
                    }}
                  >
                    <input type="hidden" name="receivableId" value={rec.id} />
                    <button
                      type="submit"
                      title="Eliminar"
                      className="text-slate-300 hover:text-rose-500 transition-colors text-sm p-1"
                    >
                      ✕
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
                      Próximo aumento: <span className="font-medium text-indigo-900">{nextAccrual.toLocaleDateString()}</span> (en ~{daysLeft} días)
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de acción del deudor */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                <button
                  onClick={() => setPaymentModalRec(rec)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                >
                  ✓ Registrar Abono
                </button>
                <button
                  onClick={() => setAdjustModalRec(rec)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95"
                  title="Aumentar deuda manualmente si te piden prestado más"
                >
                  + Más Deuda
                </button>
                <button
                  onClick={() => setEditModalRec(rec)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center"
                  title="Editar configuración o adelantar corte"
                >
                  ⚙️ Editar
                </button>
              </div>
            </div>
          );
        })}

        {receivables.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl">
            <p className="text-base font-medium text-slate-700">No tienes cuentas por cobrar registradas.</p>
            <p className="text-xs text-slate-500 mt-1">
              Usa el botón "+ Cuenta por Cobrar" para anotar deudores con reglas de aumentos semanales o mensuales.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Editar Cuenta por Cobrar y Adelantar Corte */}
      {editModalRec && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Editar Cuenta por Cobrar</h3>
                <p className="text-xs text-slate-500">{editModalRec.debtorName}</p>
              </div>
              <button
                onClick={() => setEditModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sección especial: Adelantar Corte con Confirmación */}
              {editModalRec.recurringAmount > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-wider">⚡ Adelantar Corte Manual</p>
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
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
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
                    defaultValue={new Date(editModalRec.nextAccrualDate).toISOString().split("T")[0]}
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
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Abono */}
      {paymentModalRec && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Registrar Abono</h3>
                <p className="text-xs text-slate-500">Deudor: {paymentModalRec.debtorName}</p>
              </div>
              <button
                onClick={() => setPaymentModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
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
                className="w-full bg-emerald-600 text-white px-8 py-4 mt-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {loading ? "Aplicando..." : "Aplicar Abono e Ingresar a Billetera"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aumento manual de deuda */}
      {adjustModalRec && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Aumentar Deuda</h3>
                <p className="text-xs text-slate-500">Deudor: {adjustModalRec.debtorName}</p>
              </div>
              <button
                onClick={() => setAdjustModalRec(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white px-8 py-4 mt-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-95"
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
