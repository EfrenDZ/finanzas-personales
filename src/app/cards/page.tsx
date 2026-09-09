import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CardActions from "./CardActions";
import CreditCardsSection from "../components/CreditCardsSection";

export default async function CardsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; username?: string; name?: string };
  const userId = user.id;

  const creditCards = await prisma.creditCard.findMany({
    where: { userId },
    include: {
      purchases: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Tarjetas de Crédito
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitorea tus compras a meses sin intereses, fechas de corte y pagos requeridos.
          </p>
        </div>
        <CardActions
          creditCards={creditCards.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      <CreditCardsSection creditCards={creditCards} />
    </div>
  );
}
