"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createWallet(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const user = session.user as { id: string };
  const userId = user.id;
  const name = formData.get("name") as string;
  const initialBalance = parseFloat(formData.get("initialBalance") as string) || 0;
  const rawType = (formData.get("type") as string) || "DEBIT";
  const type = ["DEBIT", "CREDIT", "CASH"].includes(rawType) ? (rawType as "DEBIT" | "CREDIT" | "CASH") : "DEBIT";

  const cutoffDayRaw = formData.get("cutoffDay") as string;
  const paymentDayRaw = formData.get("paymentDay") as string;
  const cutoffDay = cutoffDayRaw ? parseInt(cutoffDayRaw, 10) : null;
  const paymentDay = paymentDayRaw ? parseInt(paymentDayRaw, 10) : null;

  if (!name) throw new Error("El nombre es requerido");

  // Transacción atómica: Crear billetera y si hay saldo inicial, registrar la transacción inmutable
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: {
        userId,
        name,
        balance: type === "CREDIT" ? -Math.abs(initialBalance) : initialBalance,
        type,
      },
    });

    if (type === "CREDIT") {
      await tx.creditCard.create({
        data: {
          userId,
          name,
          cutoffDay: cutoffDay && !isNaN(cutoffDay) ? cutoffDay : null,
          paymentDay: paymentDay && !isNaN(paymentDay) ? paymentDay : null,
          walletId: wallet.id,
        },
      });
    }

    if (initialBalance > 0) {
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: type === "CREDIT" ? -Math.abs(initialBalance) : initialBalance,
          type: type === "CREDIT" ? "EXPENSE" : "INCOME",
          description: type === "CREDIT" ? "Saldo deudor inicial" : "Saldo inicial",
        },
      });
    }
  });

  // Refresca la interfaz automáticamente
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/cards");
}

export async function adjustWalletBalance(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const user = session.user as { id: string };
  const userId = user.id;
  const walletId = formData.get("walletId") as string;
  const newBalance = parseFloat(formData.get("newBalance") as string);
  const reason = (formData.get("reason") as string)?.trim();

  if (!walletId || isNaN(newBalance)) {
    throw new Error("Datos de ajuste inválidos");
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findFirst({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new Error("Cuenta no encontrada");
    }

    const diff = Number((newBalance - wallet.balance).toFixed(2));
    if (diff === 0) {
      return;
    }

    const type = diff > 0 ? "INCOME" : "EXPENSE";
    const amount = Math.abs(diff);
    const description = reason || "Ajuste de saldo (Conciliación)";

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type,
        description,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/accounts");
}

export async function updateWallet(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const user = session.user as { id: string };
  const userId = user.id;
  const walletId = formData.get("walletId") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!walletId || !name) {
    throw new Error("El nombre de la cuenta es requerido");
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });

  if (!wallet) {
    throw new Error("Cuenta no encontrada o no autorizada");
  }

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: walletId },
      data: { name },
    });

    // Si tiene tarjeta vinculada, sincronizar su nombre
    await tx.creditCard.updateMany({
      where: { walletId },
      data: { name },
    });
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/cards");
}

export async function deleteWallet(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const user = session.user as { id: string };
  const userId = user.id;
  const walletId = formData.get("walletId") as string;

  if (!walletId) {
    throw new Error("ID de cuenta inválido");
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });

  if (!wallet) {
    throw new Error("Cuenta no encontrada o no autorizada");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Eliminar tarjeta vinculada si existe (esto limpiará compras a crédito)
    await tx.creditCard.deleteMany({
      where: { walletId },
    });

    // 2. Eliminar transacciones donde esta cuenta sea origen o destino
    await tx.transaction.deleteMany({
      where: {
        OR: [
          { walletId },
          { destinationWalletId: walletId },
        ],
      },
    });

    // 3. Desvincular de apartados (sinking funds)
    await tx.sinkingFund.updateMany({
      where: { defaultWalletId: walletId },
      data: { defaultWalletId: null },
    });

    // 4. Desvincular de movimientos de cuentas por cobrar
    await tx.receivableTransaction.updateMany({
      where: { walletId },
      data: { walletId: null },
    });

    // 5. Eliminar la cuenta
    await tx.wallet.delete({
      where: { id: walletId },
    });
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/cards");
}

export async function setDefaultWallet(walletId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as { id: string }).id;

  if (!walletId) {
    throw new Error("ID de cuenta inválido");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Quitar predeterminada de todas las demás cuentas del usuario
    await tx.wallet.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // 2. Establecer esta como predeterminada
    await tx.wallet.update({
      where: { id: walletId, userId },
      data: { isDefault: true },
    });
  });

  revalidatePath("/");
  revalidatePath("/accounts");
}

