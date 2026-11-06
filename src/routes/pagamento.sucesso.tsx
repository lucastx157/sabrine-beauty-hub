import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkPayment } from "@/lib/payment.functions";

export const Route = createFileRoute("/pagamento/sucesso")({
  validateSearch: (s: Record<string, unknown>) => ({
    payment_id: typeof s["payment_id"] === "string" || typeof s["payment_id"] === "number" ? String(s["payment_id"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pagamento recebido | Sabrine Beauty" },
      { name: "description", content: "Confirmação do pagamento do seu agendamento na Sabrine Beauty." },
      { property: "og:title", content: "Pagamento recebido | Sabrine Beauty" },
      { property: "og:description", content: "Confirmação do pagamento do seu agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { payment_id } = Route.useSearch();
  const [status, setStatus] = useState<string>("checking");

  useEffect(() => {
    if (!payment_id) return setStatus("pending");
    checkPayment({ data: { paymentId: payment_id } })
      .then((r) => setStatus(r.status))
      .catch(() => setStatus("pending"));
  }, [payment_id]);

  const approved = status === "approved";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        {approved ? <CheckCircle2 className="mx-auto h-12 w-12 text-success" /> : <Clock className="mx-auto h-12 w-12 text-gold" />}
        <h1 className="mt-4 font-serif text-3xl text-foreground">
          {status === "checking" ? "Conferindo pagamento…" : approved ? "Agendamento confirmado!" : "Pagamento em análise"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {approved
            ? "O Mercado Pago aprovou seu pagamento. Seu horário está garantido. Até lá!"
            : status === "checking"
              ? "Só um instante."
              : "Assim que o Mercado Pago aprovar, seu horário é confirmado automaticamente. Se não for aprovado em 20 minutos, o horário volta a ficar livre."}
        </p>
        <Button asChild className="mt-6"><Link to="/">Voltar ao site</Link></Button>
      </div>
    </main>
  );
}
