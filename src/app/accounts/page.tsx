import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccruedReceivables } from "../actions/receivable";
import AccountActions from "./AccountActions";
import ReceivablesSection from "../components/ReceivablesSection";
import WalletsSection from "../components/WalletsSection";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; username?: string; name?: string };
  const userId = user.id;

  const [wallets, receivables] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getAccruedReceivables(userId),
  ]);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalReceivable = receivables.reduce((acc, r) => acc + r.currentBalance, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cuentas y Cobros
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Administra tus cuentas bancarias, efectivo y el dinero que te deben.
          </p>
        </div>
        <AccountActions />
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Saldo Total en Cuentas
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">
            ${totalBalance.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Disponible en {wallets.length} {wallets.length === 1 ? "cuenta" : "cuentas"} registrada{wallets.length === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="p-6 bg-indigo-900 text-white rounded-3xl shadow-sm">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            Total por Cobrar (Te Deben)
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-indigo-100">
            ${totalReceivable.toFixed(2)}
          </p>
          <p className="text-xs text-indigo-300 mt-2">
            {receivables.length} {receivables.length === 1 ? "deudor activo" : "deudores activos"}.
          </p>
        </div>
      </div>

      {/* Grid de Cuentas Físicas con opción de Ajuste */}
      <WalletsSection wallets={wallets} />


      {/* Cuentas por Cobrar */}
      <ReceivablesSection receivables={receivables} wallets={wallets} />
    </div>
  );
}
