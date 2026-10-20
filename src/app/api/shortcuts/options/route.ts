import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateApiRequest(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }
    const { user } = authResult;

    const [wallets, categories, receivables] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, balance: true, type: true },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { userId: user.id, type: "EXPENSE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.receivable.findMany({
        where: { userId: user.id },
        select: { id: true, debtorName: true, currentBalance: true },
        orderBy: { debtorName: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        wallets,
        categories,
        receivables,
      },
    });
  } catch (error: unknown) {
    console.error("Error en GET /api/shortcuts/options:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
