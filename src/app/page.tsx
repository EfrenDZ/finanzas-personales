import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HomeActions from "./components/HomeActions";
import RecentTransactionsSection from "./components/RecentTransactionsSection";
import { getAccruedReceivables } from "./actions/receivable";
import { checkAndProcessAutoPaySinkingFunds } from "./actions/sinkingFund";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; username?: string; name?: string };
  const userId = user.id;

  // Procesar cobros automáticos de apartados si venció la fecha
  await checkAndProcessAutoPaySinkingFunds(userId);

  // 1. Cuentas físicas y saldo líquido
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const liquidWallets = wallets.filter((w) => w.type !== "CREDIT");
  const totalBalance = liquidWallets.reduce((acc, w) => acc + w.balance, 0);

  // 2. Apartados / Fondos de reserva
  const sinkingFunds = await prisma.sinkingFund.findMany({
    where: { userId, isCompleted: false },
    orderBy: { nextDueDate: "asc" },
  });

  const totalAccumulatedFunds = sinkingFunds.reduce((acc, f) => acc + f.accumulatedAmount, 0);
  const freeLiquidity = Math.max(0, totalBalance - totalAccumulatedFunds);

  // 3. Cuentas por cobrar
  const receivables = await getAccruedReceivables(userId);
  const totalReceivable = receivables.reduce((acc, r) => acc + r.currentBalance, 0);

  // 4. Últimas transacciones
  const recentTransactions = await prisma.transaction.findMany({
    where: { wallet: { userId } },
    orderBy: { date: "desc" },
    take: 8,
    include: { wallet: true, category: true },
  });

  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  // 5. Categorías para el formulario de movimientos
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  // 6. Tarjetas de crédito (métricas para widget de acceso directo)
  const creditCards = await prisma.creditCard.findMany({
    where: { userId },
    include: {
      wallet: true,
      purchases: {
        where: { isCompleted: false },
      },
    },
  });

  const totalCreditMonthlyPayment = creditCards.reduce((acc, card) => {
    const msiMonthly = card.purchases.reduce((sum, p) => sum + p.monthlyPayment, 0);
    const revolving = card.wallet ? Math.max(0, -card.wallet.balance) : 0;
    return acc + msiMonthly + revolving;
  }, 0);

  const totalActiveCreditPurchases = creditCards.reduce((acc, card) => {
    return acc + card.purchases.length;
  }, 0);

  // 7. Cantidad de presupuestos activos
  const budgetCount = await prisma.budget.count({
    where: { userId },
  });

  const userName = user.name || user.username || "Usuario";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Saludo de bienvenida */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Hola, {userName} 👋
        </h1>
        
      </div>

      {/* Tarjetas de Resumen Financiero Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="p-6 sm:p-7 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Liquidez Total en Cuentas
            </p>
            <p className="text-3xl sm:text-5xl font-extrabold text-white">
              ${totalBalance.toFixed(2)}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-700/70 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 block">Libre para gastar</span>
              <span className="font-extrabold text-emerald-400 text-sm sm:text-base">
                ${freeLiquidity.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Apartado (Comprometido)</span>
              <span className="font-extrabold text-amber-400 text-sm sm:text-base">
                ${totalAccumulatedFunds.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-7 bg-gradient-to-br from-indigo-950 to-indigo-900 text-white rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
              Total por Cobrar (Te Deben)
            </p>
            <p className="text-3xl sm:text-5xl font-extrabold text-indigo-100">
              ${totalReceivable.toFixed(2)}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-indigo-800/80 flex items-center justify-between text-xs">
            <span className="text-indigo-300">
              {receivables.length} {receivables.length === 1 ? "deudor registrado" : "deudores registrados"}
            </span>
            <Link
              href="/accounts"
              className="text-xs font-bold text-white bg-indigo-800/70 hover:bg-indigo-800 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              Ver Cobros →
            </Link>
          </div>
        </div>
      </div>

      {/* Botones de Acción Inmediata */}
      <HomeActions wallets={wallets} categories={categories} />

      {/* Módulos de Acceso Rápido y Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* Widget Cuentas */}
        <Link
          href="/accounts"
          className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cuentas
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{wallets.length}</p>
          <p className="text-xs text-slate-400 mt-1">Cuentas registradas</p>
        </Link>

        {/* Widget Tarjetas */}
        <Link
          href="/cards"
          className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tarjetas
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${Math.ceil(totalCreditMonthlyPayment).toLocaleString("es-MX")}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {totalActiveCreditPurchases} compras activas este mes
          </p>
        </Link>

        {/* Widget Presupuestos */}
        <Link
          href="/budgets"
          className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Presupuestos
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{budgetCount}</p>
          <p className="text-xs text-slate-400 mt-1">Topes configurados</p>
        </Link>

        {/* Widget Apartados */}
        <Link
          href="/savings"
          className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Apartados y Metas
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${totalAccumulatedFunds.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {sinkingFunds.length} activos en progreso
          </p>
        </Link>
      </div>

      {/* Historial Reciente de Movimientos con Edición */}
      <RecentTransactionsSection
        transactions={recentTransactions}
        wallets={wallets}
        categories={categories}
        walletMap={Object.fromEntries(walletMap)}
      />
    </div>
  );
}
