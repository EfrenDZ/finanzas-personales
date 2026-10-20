"use client";

import { useState } from "react";
import AdjustBalanceModal from "./AdjustBalanceModal";
import { updateWallet, deleteWallet, setDefaultWallet } from "../actions/wallet";
import { formatDateDisplay } from "@/lib/date";

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  isDefault?: boolean;
}

export type WalletTransaction = {
  id: string;
  walletId: string;
  destinationWalletId?: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description?: string | null;
  date: Date | string;
  category?: { id: string; name: string } | null;
  wallet: { id: string; name: string };
};

export default function WalletsSection({
  wallets,
  transactions = [],
  walletMap = {},
}: {
  wallets: Wallet[];
  transactions?: WalletTransaction[];
  walletMap?: Record<string, string>;
}) {
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [historyWallet, setHistoryWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Cuentas Físicas y Bancos</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                  {wallet.name}
                </h3>
                {wallet.isDefault ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg">
                    ★ Predeterminada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await setDefaultWallet(wallet.id);
                      } catch (err) {
                        console.error("Error al marcar predeterminada:", err);
                      }
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-amber-600 hover:bg-amber-50 px-2 py-0.5 rounded-lg border border-transparent hover:border-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Usar como cuenta predeterminada para Atajos de iPhone"
                  >
                    <span>☆</span> Hacer predeterminada
                  </button>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800">
                ${wallet.balance.toFixed(2)}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setHistoryWallet(wallet)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="Ver historial de transacciones"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Historial
              </button>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedWallet(wallet)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Ajustar saldo de la cuenta"
                >
                  <svg
                    className="w-3.5 h-3.5 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Ajustar
                </button>

                <button
                  type="button"
                  onClick={() => setEditingWallet(wallet)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Editar o eliminar cuenta"
                >
                  <svg
                    className="w-3.5 h-3.5 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}

        {wallets.length === 0 && (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-base font-medium text-slate-700">No tienes cuentas todavía.</p>
            <p className="text-xs text-slate-400 mt-1">
              Usa el botón &quot;+ Nueva Cuenta&quot; para registrar tu efectivo o bancos.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Ajustar Saldo */}
      {selectedWallet && (
        <AdjustBalanceModal
          wallet={selectedWallet}
          isOpen={Boolean(selectedWallet)}
          onClose={() => setSelectedWallet(null)}
        />
      )}

      {/* Modal: Editar y Eliminar Cuenta */}
      {editingWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl relative">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Editar Cuenta</h3>
                <p className="text-xs text-slate-500">{editingWallet.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingWallet(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                setLoading(true);
                await updateWallet(formData);
                setLoading(false);
                setEditingWallet(null);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="walletId" value={editingWallet.id} />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre de la Cuenta
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingWallet.name}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Saldo actual:</span> ${editingWallet.balance.toFixed(2)}
                <p className="mt-1 text-slate-500">
                  Para actualizar o conciliar el saldo real, usa el botón &quot;Ajustar&quot; en la tarjeta.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </form>

            {/* Zona de Peligro: Eliminar Cuenta */}
            <div className="mt-6 pt-5 border-t border-red-100">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  if (
                    confirm(
                      `¿Estás seguro de que deseas eliminar la cuenta "${editingWallet.name}"?\n\nEsta acción borrará también todas las transacciones asociadas a esta cuenta.`
                    )
                  ) {
                    setLoading(true);
                    const formData = new FormData();
                    formData.set("walletId", editingWallet.id);
                    await deleteWallet(formData);
                    setLoading(false);
                    setEditingWallet(null);
                  }
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historial de Transacciones de la Cuenta */}
      {historyWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Historial de {historyWallet.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Saldo actual:{" "}
                  <span className="font-bold text-slate-800">
                    ${historyWallet.balance.toFixed(2)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryWallet(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4 space-y-2.5 pr-1">
              {(() => {
                const walletTxs = transactions.filter(
                  (tx) =>
                    tx.walletId === historyWallet.id ||
                    tx.destinationWalletId === historyWallet.id
                );

                if (walletTxs.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-500">
                      <p className="text-sm font-medium text-slate-700">
                        No hay movimientos registrados en esta cuenta.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Los ingresos, gastos y transferencias asociados a {historyWallet.name} aparecerán aquí.
                      </p>
                    </div>
                  );
                }

                return walletTxs.map((tx) => {
                  const isTransfer = tx.type === "TRANSFER";
                  const isOutgoingTransfer =
                    isTransfer && tx.walletId === historyWallet.id;
                  const isIncomingTransfer =
                    isTransfer && tx.destinationWalletId === historyWallet.id;
                  const isIncome = tx.type === "INCOME" || isIncomingTransfer;

                  let transferLabel = "";
                  if (isOutgoingTransfer) {
                    const destName =
                      tx.destinationWalletId && walletMap[tx.destinationWalletId]
                        ? walletMap[tx.destinationWalletId]
                        : "Otra cuenta";
                    transferLabel = `Transferencia enviada a ${destName}`;
                  } else if (isIncomingTransfer) {
                    const originName =
                      walletMap[tx.walletId] || "Otra cuenta";
                    transferLabel = `Transferencia recibida de ${originName}`;
                  }

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between transition-colors"
                    >
                      <div className="pr-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {isTransfer ? transferLabel : tx.description || "Movimiento"}
                          </p>
                          {tx.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              {tx.category.name}
                            </span>
                          )}
                          {isTransfer && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Transferencia
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDateDisplay(tx.date)}
                        </p>
                      </div>

                      <div
                        className={`text-sm sm:text-base font-extrabold whitespace-nowrap text-right ${
                          isIncome ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {isIncome ? "+" : "-"}${tx.amount.toFixed(2)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-4 mt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryWallet(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
