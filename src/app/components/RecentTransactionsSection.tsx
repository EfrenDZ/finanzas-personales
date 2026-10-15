"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "../actions/transaction";

type Wallet = { id: string; name: string; balance: number };
type Category = { id: string; name: string; type: string };

export type TransactionItem = {
  id: string;
  walletId: string;
  destinationWalletId?: string | null;
  categoryId?: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description?: string | null;
  date: Date | string;
  wallet: { id: string; name: string };
  category?: { id: string; name: string } | null;
};

export default function RecentTransactionsSection({
  transactions,
  wallets,
  categories = [],
  walletMap,
}: {
  transactions: TransactionItem[];
  wallets: Wallet[];
  categories?: Category[];
  walletMap: Record<string, string>;
}) {
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [editType, setEditType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [editWalletId, setEditWalletId] = useState<string>("");
  const [editDestWalletId, setEditDestWalletId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const openEditModal = (tx: TransactionItem) => {
    setSelectedTx(tx);
    setEditType(tx.type);
    setEditWalletId(tx.walletId);
    setEditDestWalletId(tx.destinationWalletId || (wallets.find((w) => w.id !== tx.walletId)?.id || ""));
    setErrorMessage("");
    setShowDeleteConfirm(false);
  };

  const closeEditModal = () => {
    setSelectedTx(null);
    setErrorMessage("");
    setShowDeleteConfirm(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTx) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("id", selectedTx.id);
      formData.set("type", editType);
      await updateTransaction(formData);
      closeEditModal();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al actualizar el movimiento");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTx) return;
    setLoading(true);
    setErrorMessage("");

    try {
      await deleteTransaction(selectedTx.id);
      closeEditModal();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al eliminar el movimiento");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === editType);
  const destinationWallets = wallets.filter((w) => w.id !== editWalletId);

  // Formato YYYY-MM-DD para el input type="date"
  const formattedDate = selectedTx?.date
    ? new Date(selectedTx.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Últimos Movimientos</h2>
        {transactions.length > 0 && (
          <span className="text-xs font-medium text-slate-500">
            Mostrando los {transactions.length} más recientes
          </span>
        )}
      </div>

      {transactions.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isTransfer = tx.type === "TRANSFER";
              const isIncome = tx.type === "INCOME";
              const destName = tx.destinationWalletId
                ? walletMap[tx.destinationWalletId] || "Otra cuenta"
                : "";

              return (
                <li
                  key={tx.id}
                  className="p-4 sm:p-5 flex justify-between items-center hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm sm:text-base">
                        {tx.description || "Movimiento"}
                      </p>
                      {tx.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {tx.category.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isTransfer
                        ? `${tx.wallet.name} → ${destName}`
                        : tx.wallet.name}{" "}
                      • {new Date(tx.date).toLocaleDateString("es-MX")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`font-black text-base sm:text-lg text-right ${
                        isTransfer
                          ? "text-blue-600"
                          : isIncome
                          ? "text-emerald-600"
                          : "text-slate-900"
                      }`}
                    >
                      {isTransfer ? "⇄ " : isIncome ? "+" : "-"}${tx.amount.toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(tx)}
                      title="Editar movimiento"
                      className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
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
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="p-10 text-center text-gray-500 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-base font-medium text-slate-700">No hay movimientos registrados.</p>
          <p className="text-xs text-slate-400 mt-1">
            Usa el botón &quot;+ Registrar Movimiento&quot; para empezar a registrar tus gastos e ingresos.
          </p>
        </div>
      )}

      {/* Modal de Edición */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">Editar Movimiento</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-5">
              {/* Selector de Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType("EXPENSE")}
                    className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${
                      editType === "EXPENSE"
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Gasto (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("INCOME")}
                    className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${
                      editType === "INCOME"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Ingreso (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("TRANSFER")}
                    className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${
                      editType === "TRANSFER"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Transferencia (⇄)
                  </button>
                </div>
              </div>

              {/* Cuentas */}
              {editType === "TRANSFER" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cuenta Origen (Sale)
                    </label>
                    <select
                      name="walletId"
                      value={editWalletId}
                      onChange={(e) => setEditWalletId(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} (${w.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cuenta Destino (Entra)
                    </label>
                    <select
                      name="destinationWalletId"
                      value={editDestWalletId}
                      onChange={(e) => setEditDestWalletId(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      {destinationWallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} (${w.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {editType === "INCOME" ? "¿A qué cuenta entra?" : "¿De qué cuenta sale?"}
                  </label>
                  <select
                    name="walletId"
                    value={editWalletId}
                    onChange={(e) => setEditWalletId(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (${w.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Monto y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={selectedTx.amount}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={formattedDate}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Categoría (solo para gastos o ingresos) */}
              {editType !== "TRANSFER" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    name="categoryId"
                    defaultValue={selectedTx.categoryId || ""}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="">Sin categoría</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Concepto / Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción / Concepto
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={selectedTx.description || ""}
                  placeholder="Ej. Súper, Gasolina, Nómina..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || (editType === "TRANSFER" && wallets.length < 2)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Eliminar este movimiento
                  </button>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                    <span className="text-xs text-rose-800 font-semibold">
                      ¿Confirmas eliminarlo? Se reajustará el saldo de la cuenta.
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        {loading ? "..." : "Sí, eliminar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1.5 bg-white border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-100/50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
