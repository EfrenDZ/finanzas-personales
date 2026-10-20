"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCreditCard(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const userId = (session.user as any).id;
  const name = (formData.get("name") as string)?.trim();
  const cutoffDayRaw = formData.get("cutoffDay") as string;
  const paymentDayRaw = formData.get("paymentDay") as string;

  if (!name) {
    throw new Error("El nombre de la tarjeta o deuda es obligatorio");
  }

  const cutoffDay = cutoffDayRaw ? parseInt(cutoffDayRaw, 10) : null;
  const paymentDay = paymentDayRaw ? parseInt(paymentDayRaw, 10) : null;

  await prisma.$transaction(async (tx) => {
    // 1. Crear billetera de tipo CREDIT
    const wallet = await tx.wallet.create({
      data: {
        userId,
        name,
        type: "CREDIT",
        balance: 0,
      },
    });

    // 2. Crear Tarjeta de Crédito enlazada
    await tx.creditCard.create({
      data: {
        userId,
        name,
        cutoffDay: cutoffDay && !isNaN(cutoffDay) ? cutoffDay : null,
        paymentDay: paymentDay && !isNaN(paymentDay) ? paymentDay : null,
        walletId: wallet.id,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/accounts");
}

export async function deleteCreditCard(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const creditCardId = formData.get("creditCardId") as string;
  if (!creditCardId) throw new Error("ID de tarjeta inválido");

  const card = await prisma.creditCard.findUnique({
    where: { id: creditCardId },
    select: { id: true, walletId: true },
  });

  if (!card) throw new Error("Tarjeta no encontrada");

  await prisma.$transaction(async (tx) => {
    await tx.creditCard.delete({
      where: { id: creditCardId },
    });

    if (card.walletId) {
      await tx.transaction.deleteMany({
        where: {
          OR: [
            { walletId: card.walletId },
            { destinationWalletId: card.walletId },
          ],
        },
      });
      await tx.wallet.delete({
        where: { id: card.walletId },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/accounts");
}

export async function payCreditCard(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const fromWalletId = formData.get("fromWalletId") as string;
  const creditCardId = formData.get("creditCardId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const notes = (formData.get("notes") as string)?.trim();

  if (!fromWalletId || !creditCardId || isNaN(amount) || amount <= 0) {
    throw new Error("Datos de pago inválidos");
  }

  const card = await prisma.creditCard.findUnique({
    where: { id: creditCardId },
    include: { wallet: true },
  });

  if (!card || !card.walletId) {
    throw new Error("Tarjeta de crédito o cuenta vinculada no encontrada");
  }

  const destWalletId = card.walletId;
  const description = notes || `Pago a tarjeta ${card.name}`;

  await prisma.$transaction(async (tx) => {
    // 1. Restar de cuenta origen (débito)
    await tx.wallet.update({
      where: { id: fromWalletId },
      data: { balance: { decrement: amount } },
    });

    // 2. Sumar a cuenta de crédito (reduce la deuda)
    await tx.wallet.update({
      where: { id: destWalletId },
      data: { balance: { increment: amount } },
    });

    // 3. Registrar transacción de tipo TRANSFER
    await tx.transaction.create({
      data: {
        walletId: fromWalletId,
        destinationWalletId: destWalletId,
        type: "TRANSFER",
        amount,
        description,
        date: new Date(),
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/accounts");
}

export async function createCreditPurchase(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const creditCardId = (formData.get("creditCardId") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const totalAmount = parseFloat(formData.get("totalAmount") as string);
  const totalMonthsRaw = parseInt(formData.get("totalMonths") as string, 10);
  const totalMonths = isNaN(totalMonthsRaw) || totalMonthsRaw <= 0 ? 1 : totalMonthsRaw;

  if (!creditCardId) throw new Error("Debes seleccionar una tarjeta");
  if (!description) throw new Error("La descripción es obligatoria");
  if (isNaN(totalAmount) || totalAmount <= 0) throw new Error("El monto total es inválido");

  // Si son MSI, la mensualidad se calcula
  const monthlyPayment = parseFloat((totalAmount / totalMonths).toFixed(2));

  await prisma.creditPurchase.create({
    data: {
      creditCardId,
      description,
      totalAmount,
      totalMonths,
      paidMonths: 0,
      monthlyPayment,
      isCompleted: false,
    },
  });

  revalidatePath("/");
}

export async function payCreditPurchaseMonth(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const purchaseId = formData.get("purchaseId") as string;
  if (!purchaseId) throw new Error("ID de compra inválido");

  const purchase = await prisma.creditPurchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) throw new Error("Compra no encontrada");

  const newPaidMonths = purchase.paidMonths + 1;
  const isCompleted = newPaidMonths >= purchase.totalMonths;

  await prisma.creditPurchase.update({
    where: { id: purchaseId },
    data: {
      paidMonths: newPaidMonths,
      isCompleted,
    },
  });

  revalidatePath("/");
}

export async function deleteCreditPurchase(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const purchaseId = formData.get("purchaseId") as string;
  if (!purchaseId) throw new Error("ID de compra inválido");

  await prisma.creditPurchase.delete({
    where: { id: purchaseId },
  });

  revalidatePath("/");
}
