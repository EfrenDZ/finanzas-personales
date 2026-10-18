"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseDateInput } from "@/lib/date";

// Crear nuevo Fondo de Reserva / Apartado
export async function createSinkingFund(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const name = (formData.get("name") as string)?.trim();
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const frequencyDays = parseInt(formData.get("frequencyDays") as string, 10) || 7;
  const nextDueDateStr = formData.get("nextDueDate") as string;
  const initialAccumulated = parseFloat(formData.get("initialAccumulated") as string) || 0;
  const cycleType = (formData.get("cycleType") as string) === "ESTIMATED" ? "ESTIMATED" : "STRICT";
  const isOneOff = formData.get("isOneOff") === "true";
  const autoPay = formData.get("autoPay") === "true";
  const defaultWalletId = (formData.get("defaultWalletId") as string) || null;

  if (!name || isNaN(targetAmount) || targetAmount <= 0) {
    throw new Error("Nombre o monto objetivo inválido");
  }

  let nextDueDate: Date;
  if (nextDueDateStr) {
    nextDueDate = parseDateInput(nextDueDateStr);
  } else {
    nextDueDate = new Date(Date.now() + frequencyDays * 86400000);
  }

  await prisma.sinkingFund.create({
    data: {
      userId,
      name,
      targetAmount,
      frequencyDays,
      cycleType,
      isOneOff,
      autoPay,
      defaultWalletId: autoPay && defaultWalletId ? defaultWalletId : null,
      nextDueDate,
      accumulatedAmount: initialAccumulated,
    },
  });

  revalidatePath("/");
  revalidatePath("/savings");
}

// Asignar dinero del saldo a este apartado (comprometer dinero)
export async function allocateToFund(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const fundId = formData.get("fundId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (!fundId || isNaN(amount) || amount <= 0) {
    throw new Error("Monto a apartar inválido");
  }

  await prisma.sinkingFund.update({
    where: { id: fundId },
    data: {
      accumulatedAmount: { increment: amount },
    },
  });

  revalidatePath("/");
  revalidatePath("/savings");
}

// Asignar dinero distribuido a múltiples apartados
export async function allocateGeneralToFunds(allocations: { fundId: string; amount: number }[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const validAllocations = allocations.filter((a) => a.fundId && !isNaN(a.amount) && a.amount > 0);
  if (validAllocations.length === 0) {
    throw new Error("No hay montos válidos para distribuir");
  }

  await prisma.$transaction(
    validAllocations.map((a) =>
      prisma.sinkingFund.update({
        where: { id: a.fundId },
        data: {
          accumulatedAmount: { increment: a.amount },
        },
      })
    )
  );

  revalidatePath("/");
  revalidatePath("/savings");
}

// Liberar dinero del apartado (desapartar dinero hacia liquidez libre)
export async function releaseFromFund(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const fundId = formData.get("fundId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (!fundId || isNaN(amount) || amount <= 0) {
    throw new Error("Monto a liberar inválido");
  }

  const fund = await prisma.sinkingFund.findFirst({ where: { id: fundId, userId } });
  if (!fund) throw new Error("Apartado no encontrado");

  const newAmount = Math.max(0, fund.accumulatedAmount - amount);

  await prisma.sinkingFund.update({
    where: { id: fundId },
    data: {
      accumulatedAmount: newAmount,
    },
  });

  revalidatePath("/");
  revalidatePath("/savings");
}

// Registrar la compra real con el dinero apartado
export async function executeFundExpense(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const fundId = formData.get("fundId") as string;
  const walletId = formData.get("walletId") as string;
  const expenseAmount = parseFloat(formData.get("expenseAmount") as string);

  if (!fundId || !walletId || isNaN(expenseAmount) || expenseAmount <= 0) {
    throw new Error("Datos de pago inválidos");
  }

  const fund = await prisma.sinkingFund.findUnique({ where: { id: fundId } });
  if (!fund) throw new Error("Apartado no encontrado");

  await prisma.$transaction(async (tx) => {
    // 1. Restar el dinero de la billetera física/bancaria
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: { decrement: expenseAmount },
      },
    });

    // 2. Registrar la transacción de gasto
    await tx.transaction.create({
      data: {
        walletId,
        type: "EXPENSE",
        amount: expenseAmount,
        description: `Pago de apartado: ${fund.name}`,
      },
    });

    // 3. Si es gasto único, marcarlo como completado; si es recurrente, reiniciar acumulado y avanzar ciclo
    if (fund.isOneOff) {
      await tx.sinkingFund.update({
        where: { id: fundId },
        data: {
          accumulatedAmount: 0,
          isCompleted: true,
        },
      });
    } else {
      const baseDateForNext = fund.cycleType === "STRICT" ? new Date(fund.nextDueDate).getTime() : Date.now();
      const nextDueDate = new Date(baseDateForNext + fund.frequencyDays * 86400000);

      await tx.sinkingFund.update({
        where: { id: fundId },
        data: {
          accumulatedAmount: Math.max(0, fund.accumulatedAmount - expenseAmount),
          nextDueDate,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/savings");
  revalidatePath("/accounts");
}

// Actualizar datos del apartado
export async function updateSinkingFund(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const fundId = formData.get("fundId") as string;
  const name = (formData.get("name") as string)?.trim();
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const frequencyDays = parseInt(formData.get("frequencyDays") as string, 10);
  const nextDueDateStr = formData.get("nextDueDate") as string;
  const accumulatedAmount = parseFloat(formData.get("accumulatedAmount") as string);
  const autoPay = formData.get("autoPay") === "true";
  const defaultWalletId = (formData.get("defaultWalletId") as string) || null;

  if (!fundId || !name || isNaN(targetAmount) || targetAmount <= 0) {
    throw new Error("Datos inválidos");
  }

  const nextDueDate = nextDueDateStr 
    ? parseDateInput(nextDueDateStr)
    : new Date();

  await prisma.sinkingFund.update({
    where: { id: fundId },
    data: {
      name,
      targetAmount,
      frequencyDays,
      nextDueDate,
      autoPay,
      defaultWalletId: autoPay && defaultWalletId ? defaultWalletId : null,
      accumulatedAmount: isNaN(accumulatedAmount) ? 0 : accumulatedAmount,
    },
  });

  revalidatePath("/");
  revalidatePath("/savings");
}

// Procesar automáticamente los apartados configurados con cobro automático cuya fecha haya llegado
export async function checkAndProcessAutoPaySinkingFunds(userId: string) {
  const now = new Date();

  const dueFunds = await prisma.sinkingFund.findMany({
    where: {
      userId,
      isCompleted: false,
      autoPay: true,
      defaultWalletId: { not: null },
      nextDueDate: { lte: now },
    },
    include: {
      defaultWallet: true,
    },
  });

  if (dueFunds.length === 0) return;

  for (const fund of dueFunds) {
    if (!fund.defaultWalletId) continue;

    const expenseAmount = fund.targetAmount;

    await prisma.$transaction(async (tx) => {
      // 1. Descontar de la billetera predeterminada
      await tx.wallet.update({
        where: { id: fund.defaultWalletId! },
        data: {
          balance: { decrement: expenseAmount },
        },
      });

      // 2. Registrar la transacción de gasto en el historial
      await tx.transaction.create({
        data: {
          walletId: fund.defaultWalletId!,
          type: "EXPENSE",
          amount: expenseAmount,
          description: `Cobro automático de apartado: ${fund.name}`,
        },
      });

      // 3. Si es gasto único, completar; si es recurrente, restar acumulado y avanzar ciclo
      if (fund.isOneOff) {
        await tx.sinkingFund.update({
          where: { id: fund.id },
          data: {
            accumulatedAmount: 0,
            isCompleted: true,
          },
        });
      } else {
        const baseDateForNext = fund.cycleType === "STRICT" 
          ? new Date(fund.nextDueDate).getTime() 
          : Date.now();
        const nextDueDate = new Date(baseDateForNext + fund.frequencyDays * 86400000);

        await tx.sinkingFund.update({
          where: { id: fund.id },
          data: {
            accumulatedAmount: Math.max(0, fund.accumulatedAmount - expenseAmount),
            nextDueDate,
          },
        });
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/savings");
}

// Eliminar apartado
export async function deleteSinkingFund(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const fundId = formData.get("fundId") as string;
  if (!fundId) throw new Error("ID inválido");

  await prisma.sinkingFund.deleteMany({
    where: { id: fundId, userId },
  });

  revalidatePath("/");
  revalidatePath("/savings");
}
