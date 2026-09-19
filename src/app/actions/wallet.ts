"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createWallet(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const name = formData.get("name") as string;
  const initialBalance = parseFloat(formData.get("initialBalance") as string) || 0;

  if (!name) throw new Error("El nombre es requerido");

  // Transacción atómica: Crear billetera y si hay saldo inicial, registrar la transacción inmutable
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: {
        userId,
        name,
        balance: initialBalance,
      },
    });

    if (initialBalance > 0) {
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: initialBalance,
          type: "INCOME",
          description: "Saldo inicial",
        },
      });
    }
  });

  // Refresca la interfaz automáticamente
  revalidatePath("/");
  revalidatePath("/accounts");
}

export async function adjustWalletBalance(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
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

