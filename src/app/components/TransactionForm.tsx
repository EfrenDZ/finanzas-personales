"use client";

import { useRef, useState } from "react";
import { createTransaction } from "../actions/transaction";

type Wallet = { id: string; name: string; balance: number };
type Category = { id: string; name: string; type: string };

export default function TransactionForm({ 
  wallets, 
  categories = [], 
  onSuccess,
  defaultType = "EXPENSE",
  defaultCategoryId = "",
  lockCategory = false,
}: { 
  wallets: Wallet[]; 
  categories?: Category[]; 
  onSuccess?: () => void; 
  defaultType?: "EXPENSE" | "INCOME" | "TRANSFER";
  defaultCategoryId?: string;
  lockCategory?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(defaultType);
  const [originWalletId, setOriginWalletId] = useState<string>(wallets[0]?.id || "");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isNewCategory, setIsNewCategory] = useState(false);

  if (wallets.length === 0) {
    return <p className="text-red-500 font-medium text-center">Debes crear una cuenta primero.</p>;
  }

  const filteredCategories = categories.filter(c => c.type === type);
  const destinationWallets = wallets.filter(w => w.id !== originWalletId);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setErrorMessage("");
        setLoading(true);
        try {
          await createTransaction(formData);
          formRef.current?.reset();
          onSuccess?.();
        } catch (err: any) {
          setErrorMessage(err?.message || "Ocurrió un error al procesar el movimiento.");
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-5"
    >
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Movimiento</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${
              type === "EXPENSE"
                ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Gasto (-)
          </button>
          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${
              type === "INCOME"
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Ingreso (+)
          </button>
          <button
            type="button"
            onClick={() => setType("TRANSFER")}
            className={`py-2.5 px-3 rounded-xl font-semibold text-sm transition-all border ${
              type === "TRANSFER"
                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Transferencia (⇄)
          </button>
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      {type === "TRANSFER" ? (
        <>
          {wallets.length < 2 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium">
              Necesitas registrar al menos dos cuentas para poder transferir dinero entre ellas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta Origen (Sale)</label>
                <select
                  name="walletId"
                  value={originWalletId}
                  onChange={(e) => setOriginWalletId(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} (${w.balance.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta Destino (Entra)</label>
                <select
                  name="destinationWalletId"
                  required
                  defaultValue={destinationWallets[0]?.id || ""}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {destinationWallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} (${w.balance.toFixed(2)})</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {type === "INCOME" ? "¿A qué cuenta entra?" : "¿De qué cuenta sale?"}
          </label>
          <select
            name="walletId"
            value={originWalletId}
            onChange={(e) => setOriginWalletId(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.name} (${w.balance.toFixed(2)})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($)</label>
        <input 
          type="number" 
          name="amount" 
          step="0.01" 
          min="0.01" 
          required 
          placeholder="0.00" 
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
        />
      </div>

      {type !== "TRANSFER" && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">Categoría</label>
            {!lockCategory && filteredCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setIsNewCategory(!isNewCategory)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {isNewCategory ? "Elegir existente" : "+ Nueva categoría"}
              </button>
            )}
          </div>

          {lockCategory && defaultCategoryId ? (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
                  Tope de Gasto Asignado
                </span>
                <span className="font-extrabold text-blue-950 text-base">
                  {categories.find((c) => c.id === defaultCategoryId)?.name || "Categoría"}
                </span>
              </div>
              <input type="hidden" name="categoryId" value={defaultCategoryId} />
            </div>
          ) : isNewCategory || filteredCategories.length === 0 ? (
            <input
              type="text"
              name="newCategoryName"
              placeholder="Ej. Salidas, Comida, Sueldo..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          ) : (
            <select
              name="categoryId"
              defaultValue={defaultCategoryId || ""}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Concepto</label>
        <input 
          type="text" 
          name="description" 
          placeholder={type === "TRANSFER" ? "Ej. Retiro a efectivo, traspaso a Nu..." : "Ej. Gasolina, Tacos..."}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading || (type === "TRANSFER" && wallets.length < 2)} 
        className={`w-full text-white px-8 py-4 mt-6 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${
          type === "TRANSFER" 
            ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            : type === "INCOME"
            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
        }`}
      >
        {loading ? "Registrando..." : type === "TRANSFER" ? "Transferir Entre Cuentas" : "Registrar Movimiento"}
      </button>
    </form>
  );
}
