"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseDateInput, getDatePartsInTimezone } from "@/lib/date";

// Función auxiliar para calcular la siguiente fecha de corte
function advanceAccrualDate(
  currentDate: Date,
  frequencyType: string,
  frequencyDays: number,
  anchorDay: number | null
): Date {
  const d = new Date(currentDate);
  if (frequencyType === "MONTHLY" && anchorDay) {
    d.setMonth(d.getMonth() + 1);
    const maxDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(anchorDay, maxDays));
    return d;
  } else if (frequencyType === "WEEKLY") {
    d.setDate(d.getDate() + 7);
    return d;
  } else if (frequencyType === "DAILY") {
    d.setDate(d.getDate() + 1);
    return d;
  } else if (frequencyType === "BIWEEKLY") {
    d.setDate(d.getDate() + 14);
    return d;
  } else {
    const days = frequencyDays > 0 ? frequencyDays : 7;
    d.setDate(d.getDate() + days);
    return d;
  }
}

// Traer cuentas por cobrar procesando automáticamente los aumentos programados
export async function getAccruedReceivables(userId: string) {
  const receivables = await prisma.receivable.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const updatedList = await Promise.all(
    receivables.map(async (rec) => {
      if (rec.recurringAmount > 0) {
        let nextDate = new Date(rec.nextAccrualDate);
        let addedCount = 0;

        // Si ya llegó o se superó la fecha programada del próximo aumento
        while (now.getTime() >= nextDate.getTime()) {
          addedCount++;
          nextDate = advanceAccrualDate(
            nextDate,
            rec.frequencyType,
            rec.frequencyDays,
            rec.anchorDay
          );
        }

        if (addedCount > 0) {
          const addedAmount = addedCount * rec.recurringAmount;
          return await prisma.receivable.update({
            where: { id: rec.id },
            data: {
              currentBalance: { increment: addedAmount },
              nextAccrualDate: nextDate,
            },
          });
        }
      }
      return rec;
    })
  );

  return updatedList;
}

// Crear nueva cuenta por cobrar con día exacto de corte
export async function createReceivable(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const debtorName = (formData.get("debtorName") as string)?.trim();
  const initialBalance = parseFloat(formData.get("initialBalance") as string) || 0;
  const recurringAmount = parseFloat(formData.get("recurringAmount") as string) || 0;
  const frequencyType = (formData.get("frequencyType") as string) || "WEEKLY";
  const customDays = parseInt(formData.get("customDays") as string, 10) || 7;
  const firstAccrualDateStr = formData.get("firstAccrualDate") as string;
  const notes = (formData.get("notes") as string)?.trim();

  if (!debtorName) {
    throw new Error("El nombre de la persona o entidad es requerido");
  }

  // Determinar la fecha exacta del próximo corte
  const nextAccrualDate = firstAccrualDateStr 
    ? new Date(`${firstAccrualDateStr}T12:00:00`)
    : new Date();

  // Derivar automáticamente el día ancla a partir de la fecha seleccionada
  let anchorDay: number | null = null;
  if (frequencyType === "WEEKLY") {
    anchorDay = nextAccrualDate.getDay();
  } else if (frequencyType === "MONTHLY") {
    anchorDay = nextAccrualDate.getDate();
  }

  await prisma.receivable.create({
    data: {
      userId,
      debtorName,
      currentBalance: initialBalance,
      recurringAmount,
      frequencyType,
      frequencyDays: customDays,
      anchorDay,
      nextAccrualDate,
      notes,
    },
  });

  revalidatePath("/");
}

// Forzar o adelantar la suma del corte ahora
export async function forceAccrueReceivable(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const receivableId = formData.get("receivableId") as string;
  const rec = await prisma.receivable.findUnique({ where: { id: receivableId } });
  if (!rec || rec.recurringAmount <= 0) return;

  const nextDate = advanceAccrualDate(
    rec.nextAccrualDate,
    rec.frequencyType,
    rec.frequencyDays,
    rec.anchorDay
  );

  await prisma.receivable.update({
    where: { id: receivableId },
    data: {
      currentBalance: { increment: rec.recurringAmount },
      nextAccrualDate: nextDate,
    },
  });

  revalidatePath("/");
}

// Actualizar datos de una cuenta por cobrar
export async function updateReceivable(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const receivableId = formData.get("receivableId") as string;
  const debtorName = (formData.get("debtorName") as string)?.trim();
  const currentBalance = parseFloat(formData.get("currentBalance") as string);
  const recurringAmount = parseFloat(formData.get("recurringAmount") as string) || 0;
  const frequencyType = (formData.get("frequencyType") as string) || "WEEKLY";
  const customDays = parseInt(formData.get("customDays") as string, 10) || 7;
  const nextAccrualDateStr = formData.get("nextAccrualDate") as string;
  const notes = (formData.get("notes") as string)?.trim();

  if (!receivableId || !debtorName || isNaN(currentBalance)) {
    throw new Error("Datos inválidos para actualizar");
  }

  const nextAccrualDate = nextAccrualDateStr
    ? new Date(`${nextAccrualDateStr}T12:00:00`)
    : new Date();

  let anchorDay: number | null = null;
  if (frequencyType === "WEEKLY") {
    anchorDay = nextAccrualDate.getDay();
  } else if (frequencyType === "MONTHLY") {
    anchorDay = nextAccrualDate.getDate();
  }

  await prisma.receivable.update({
    where: { id: receivableId },
    data: {
      debtorName,
      currentBalance,
      recurringAmount,
      frequencyType,
      frequencyDays: customDays,
      anchorDay,
      nextAccrualDate,
      notes,
    },
  });

  revalidatePath("/");
}

// Registrar un abono (cuando te pagan)
export async function recordReceivablePayment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const receivableId = formData.get("receivableId") as string;
  const walletId = formData.get("walletId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const notes = (formData.get("notes") as string)?.trim();

  if (!receivableId || !walletId || !amount || amount <= 0) {
    throw new Error("Datos de abono inválidos");
  }

  const receivable = await prisma.receivable.findUnique({
    where: { id: receivableId },
  });

  if (!receivable) throw new Error("Cuenta por cobrar no encontrada");

  await prisma.$transaction(async (tx) => {
    // 1. Reducir la deuda del deudor
    await tx.receivable.update({
      where: { id: receivableId },
      data: {
        currentBalance: { decrement: amount },
      },
    });

    // 2. Aumentar el saldo real en la billetera seleccionada
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
      },
    });

    // 3. Registrar la transacción de ingreso en el historial
    await tx.transaction.create({
      data: {
        walletId,
        type: "INCOME",
        amount,
        description: notes || `Abono recibido de ${receivable.debtorName}`,
      },
    });
  });

  revalidatePath("/");
}

// Ajuste manual (ej. te pidieron prestado más o sumaron cargo)
export async function adjustReceivableDebt(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const receivableId = formData.get("receivableId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (!receivableId || !amount || amount <= 0) {
    throw new Error("Monto inválido");
  }

  await prisma.receivable.update({
    where: { id: receivableId },
    data: {
      currentBalance: { increment: amount },
    },
  });

  revalidatePath("/");
}

// Eliminar cuenta por cobrar
export async function deleteReceivable(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const receivableId = formData.get("receivableId") as string;
  if (!receivableId) throw new Error("ID inválido");

  await prisma.receivable.delete({
    where: { id: receivableId },
  });

  revalidatePath("/");
}
