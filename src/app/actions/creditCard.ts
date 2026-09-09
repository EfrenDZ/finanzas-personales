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

  await prisma.creditCard.create({
    data: {
      userId,
      name,
      cutoffDay: cutoffDay && !isNaN(cutoffDay) ? cutoffDay : null,
      paymentDay: paymentDay && !isNaN(paymentDay) ? paymentDay : null,
    },
  });

  revalidatePath("/");
}

export async function deleteCreditCard(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const creditCardId = formData.get("creditCardId") as string;
  if (!creditCardId) throw new Error("ID de tarjeta inválido");

  await prisma.creditCard.delete({
    where: { id: creditCardId },
  });

  revalidatePath("/");
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
