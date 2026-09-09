"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTransaction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const walletId = formData.get("walletId") as string;
  const destinationWalletId = formData.get("destinationWalletId") as string;
  const type = formData.get("type") as "INCOME" | "EXPENSE" | "TRANSFER";
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
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
}
