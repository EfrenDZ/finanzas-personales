import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BudgetActions from "./BudgetActions";
import BudgetsSection from "../components/BudgetsSection";

export default async function BudgetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; username?: string; name?: string };
  const userId = user.id;

  const [rawBudgets, categories, wallets] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = new Date();
  const budgetsWithStats = await Promise.all(
    rawBudgets.map(async (b) => {
      const cycleDurationMs = Math.max(1, b.frequencyDays) * 86400000;
      const startMs = new Date(b.startDate).getTime();
      const elapsedMs = Math.max(0, now.getTime() - startMs);
      const completedCycles = Math.floor(elapsedMs / cycleDurationMs);
      const cycleStart = new Date(startMs + completedCycles * cycleDurationMs);
      const cycleEnd = new Date(cycleStart.getTime() + cycleDurationMs);
      const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / 86400000));

      const txSum = await prisma.transaction.aggregate({
        where: {
          wallet: { userId },
          categoryId: b.categoryId,
          type: "EXPENSE",
          date: {
            gte: cycleStart,
            lt: cycleEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      return {
        id: b.id,
        limitAmount: b.limitAmount,
        frequencyDays: b.frequencyDays,
        startDate: b.startDate,
        category: {
          id: b.category.id,
          name: b.category.name,
        },
        spent: txSum._sum.amount || 0,
        cycleStart,
        cycleEnd,
        daysRemaining,
      };
    })
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Topes de Gasto
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Fija límites periódicos a tus categorías para controlar gastos impulsivos.
          </p>
        </div>
        <BudgetActions categories={categories} />
      </div>

      <BudgetsSection
        budgets={budgetsWithStats}
        wallets={wallets}
        categories={categories}
      />
    </div>
  );
}
