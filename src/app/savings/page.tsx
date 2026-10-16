import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SavingActions from "./SavingActions";
import SinkingFundsSection from "../components/SinkingFundsSection";
import { checkAndProcessAutoPaySinkingFunds } from "../actions/sinkingFund";

export default async function SavingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; username?: string; name?: string };
  const userId = user.id;

  // Procesar cobros automáticos si venció la fecha
  await checkAndProcessAutoPaySinkingFunds(userId);

  const [sinkingFunds, wallets] = await Promise.all([
    prisma.sinkingFund.findMany({
      where: { userId, isCompleted: false },
      include: { defaultWallet: true },
      orderBy: { nextDueDate: "asc" },
    }),
    prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Apartados y Metas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Provisiona dinero poco a poco para gastos futuros, seguros o metas de ahorro.
          </p>
        </div>
        <SavingActions wallets={wallets} />
      </div>

      <SinkingFundsSection sinkingFunds={sinkingFunds} wallets={wallets} />
    </div>
  );
}
