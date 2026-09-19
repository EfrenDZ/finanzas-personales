"use client";

import { useState } from "react";
import AdjustBalanceModal from "./AdjustBalanceModal";

interface Wallet {
  id: string;
  name: string;
  balance: number;
}

export default function WalletsSection({ wallets }: { wallets: Wallet[] }) {
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

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
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800">
                ${wallet.balance.toFixed(2)}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedWallet(wallet)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-all active:scale-95"
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
                Ajustar Saldo
              </button>
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

      {selectedWallet && (
        <AdjustBalanceModal
          wallet={selectedWallet}
          isOpen={Boolean(selectedWallet)}
          onClose={() => setSelectedWallet(null)}
        />
      )}
    </section>
  );
}
