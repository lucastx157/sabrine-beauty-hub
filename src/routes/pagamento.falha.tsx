import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pagamento/falha")({
  head: () => ({
    meta: [
      { title: "Pagamento não concluído | Sabrine Beauty" },
      { name: "description", content: "Seu pagamento não foi concluído. Tente agendar novamente." },
      { property: "og:title", content: "Pagamento não concluído | Sabrine Beauty" },
      { property: "og:description", content: "Seu pagamento não foi concluído." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 font-serif text-3xl text-foreground">Pagamento não concluído</h1>
        <p className="mt-3 text-muted-foreground">
          Nada foi cobrado e o horário não ficou marcado. Você pode tentar de novo com outro cartão ou com Pix.
        </p>
        <Button asChild className="mt-6"><Link to="/" hash="agendamento">Tentar novamente</Link></Button>
      </div>
    </main>
  ),
});
