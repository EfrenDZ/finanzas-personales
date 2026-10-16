"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseDateInput } from "@/lib/date";

export async function createTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const walletId = formData.get("walletId") as string;
  const destinationWalletId = formData.get("destinationWalletId") as string;
  const type = formData.get("type") as "INCOME" | "EXPENSE" | "TRANSFER";
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
  const dateStr = (formData.get("date") as string)?.trim();
  const txDate = dateStr ? parseDateInput(dateStr) : new Date();
  let categoryId = (formData.get("categoryId") as string)?.trim() || null;
  const newCategoryName = (formData.get("newCategoryName") as string)?.trim();

  if (!walletId || !amount || amount <= 0) {
    throw new Error("Datos inválidos");
  }

  if (!categoryId && newCategoryName && type !== "TRANSFER") {
    let existingCat = await prisma.category.findFirst({
      where: {
        userId,
        name: { equals: newCategoryName, mode: "insensitive" },
        type,
      },
    });
    if (!existingCat) {
      existingCat = await prisma.category.create({
        data: {
          userId,
          name: newCategoryName,
          type,
        },
      });
    }
    categoryId = existingCat.id;
  }

  if (type === "TRANSFER") {
    if (!destinationWalletId || destinationWalletId === walletId) {
      throw new Error("Debes seleccionar una cuenta destino diferente");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Restar de la cuenta origen
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // 2. Sumar a la cuenta destino
      await tx.wallet.update({
        where: { id: destinationWalletId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 3. Registrar la transacción
      await tx.transaction.create({
        data: {
          walletId,
          destinationWalletId,
          type: "TRANSFER",
          amount,
          description: description?.trim() || "Transferencia entre cuentas",
          date: txDate,
        },
      });
    });
  } else {
    // Usamos una transacción atómica para ingreso o gasto
    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          walletId,
          categoryId: categoryId || null,
          type,
          amount,
          description: description?.trim() || (type === "INCOME" ? "Ingreso" : "Gasto"),
          date: txDate,
        },
      });

      const balanceChange = type === "INCOME" ? amount : -amount;

      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    });
  }

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
}

export async function updateTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const transactionId = formData.get("id") as string;
  const newWalletId = formData.get("walletId") as string;
  const newDestWalletId = (formData.get("destinationWalletId") as string) || null;
  const newType = formData.get("type") as "INCOME" | "EXPENSE" | "TRANSFER";
  const newAmount = parseFloat(formData.get("amount") as string);
  const newDescription = (formData.get("description") as string)?.trim() || "";
  const newCategoryId = (formData.get("categoryId") as string)?.trim() || null;
  const dateStr = formData.get("date") as string;

  if (!transactionId || !newWalletId || !newAmount || newAmount <= 0) {
    throw new Error("Datos inválidos");
  }

  const oldTx = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      wallet: { userId },
    },
  });

  if (!oldTx) {
    throw new Error("Movimiento no encontrado o no autorizado");
  }

  const targetWallet = await prisma.wallet.findFirst({
    where: { id: newWalletId, userId },
  });
  if (!targetWallet) {
    throw new Error("La cuenta seleccionada no existe o no te pertenece");
  }

  if (newType === "TRANSFER") {
    if (!newDestWalletId || newDestWalletId === newWalletId) {
      throw new Error("Debes seleccionar una cuenta destino diferente");
    }
    const targetDestWallet = await prisma.wallet.findFirst({
      where: { id: newDestWalletId, userId },
    });
    if (!targetDestWallet) {
      throw new Error("La cuenta destino no existe o no te pertenece");
    }
  }

  const txDate = dateStr ? parseDateInput(dateStr) : oldTx.date;

  await prisma.$transaction(async (tx) => {
    // 1. Revertir saldo anterior
    if (oldTx.type === "INCOME") {
      await tx.wallet.update({
        where: { id: oldTx.walletId },
        data: { balance: { decrement: oldTx.amount } },
      });
    } else if (oldTx.type === "EXPENSE") {
      await tx.wallet.update({
        where: { id: oldTx.walletId },
        data: { balance: { increment: oldTx.amount } },
      });
    } else if (oldTx.type === "TRANSFER") {
      await tx.wallet.update({
        where: { id: oldTx.walletId },
        data: { balance: { increment: oldTx.amount } },
      });
      if (oldTx.destinationWalletId) {
        await tx.wallet.update({
          where: { id: oldTx.destinationWalletId },
          data: { balance: { decrement: oldTx.amount } },
        });
      }
    }

    // 2. Aplicar nuevo saldo
    if (newType === "INCOME") {
      await tx.wallet.update({
        where: { id: newWalletId },
        data: { balance: { increment: newAmount } },
      });
    } else if (newType === "EXPENSE") {
      await tx.wallet.update({
        where: { id: newWalletId },
        data: { balance: { decrement: newAmount } },
      });
    } else if (newType === "TRANSFER") {
      await tx.wallet.update({
        where: { id: newWalletId },
        data: { balance: { decrement: newAmount } },
      });
      await tx.wallet.update({
        where: { id: newDestWalletId! },
        data: { balance: { increment: newAmount } },
      });
    }

    // 3. Actualizar movimiento
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        walletId: newWalletId,
        destinationWalletId: newType === "TRANSFER" ? newDestWalletId : null,
        categoryId: newType === "TRANSFER" ? null : newCategoryId || null,
        type: newType,
        amount: newAmount,
        description:
          newDescription ||
          (newType === "INCOME" ? "Ingreso" : newType === "EXPENSE" ? "Gasto" : "Transferencia"),
        date: txDate,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
}

export async function deleteTransaction(transactionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;

  const oldTx = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      wallet: { userId },
    },
  });

  if (!oldTx) {
    throw new Error("Movimiento no encontrado o no autorizado");
  }

  await prisma.$transaction(async (tx) => {
    if (oldTx.type === "INCOME") {
      await tx.wallet.update({
        where: { id: oldTx.walletId },
        data: { balance: { decrement: oldTx.amount } },
      });
    } else if (oldTx.type === "EXPENSE") {
      await tx.wallet.update({
        where: { id: oldTx.walletId },
        data: { balance: { increment: oldTx.amount } },
      });
    } else if (oldTx.type === "TRANSFER") {
      await tx.wallet.update({
        where: { id: oldTx.walletId },
        data: { balance: { increment: oldTx.amount } },
      });
      if (oldTx.destinationWalletId) {
        await tx.wallet.update({
          where: { id: oldTx.destinationWalletId },
          data: { balance: { decrement: oldTx.amount } },
        });
      }
    }

    await tx.transaction.delete({
      where: { id: transactionId },
    });
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
}
