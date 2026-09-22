import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Send, Calendar, Clock, Sparkles, Scissors, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listServices } from "@/lib/booking.functions";
import { chatWithAssistant } from "@/lib/ai.functions";
import { formatCurrencyCents } from "@/lib/dates";
import { toast } from "sonner";

const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: () => listServices({ data: undefined }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sabrine Beauty Flow | Agende seu Design de Sobrancelhas" },
      {
        name: "description",
        content:
          "Agende online design de sobrancelhas, henna, coloração, hydra gloss e brow lamination com a Sabrine Beauty. Atendimento personalizado e sofisticado.",
      },
      { property: "og:title", content: "Sabrine Beauty Flow | Agende seu Design de Sobrancelhas" },
      {
        property: "og:description",
        content:
          "Agende online design de sobrancelhas, henna, coloração, hydra gloss e brow lamination com a Sabrine Beauty.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://id-preview--bd17da20-933c-4eb6-bf50-910f94bce894.lovable.app/images/hero.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://id-preview--bd17da20-933c-4eb6-bf50-910f94bce894.lovable.app/images/hero.jpg",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQueryOptions),
  component: HomePage,
});

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function HomePage() {
  const { data: services } = useSuspenseQuery(servicesQueryOptions);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 opacity-40">
          <img
            src="/images/hero.jpg"
            alt="Design de sobrancelhas"
            className="h-full w-full object-cover"
            width={1280}
            height={800}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-28 lg:py-40">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Sabrine Beauty Flow
          </span>
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-foreground md:text-6xl">
            Realce sua beleza natural com sofisticação
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Agende seu design de sobrancelhas, henna, coloração, hydra gloss e brow lamination com
            praticidade. Nossa assistente virtual encontra o horário perfeito para você.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <a href="#assistente">Agendar pelo assistente</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <a href="#servicos">Ver serviços</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Nossos serviços
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada detalhe pensado para valorizar o seu olhar.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group flex flex-col overflow-hidden border border-border/60 bg-card shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground">{service.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrencyCents(service.price_min ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {service.duration_min} min
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="bg-secondary/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 py-20 lg:flex-row">
          <div className="flex-1">
            <img
              src="/images/before-after.jpg"
              alt="Antes e depois do design de sobrancelhas"
              className="rounded-2xl shadow-card"
              width={1200}
              height={800}
              loading="lazy"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Transformação natural e elegante
            </h2>
            <p className="mt-4 text-muted-foreground">
              Cada procedimento é planejado para harmonizar com o seu rosto e estilo. O resultado?
              Um olhar mais expressivo, sem perder a naturalidade.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Design personalizado de acordo com seu rosto",
                "Produtos de qualidade e técnica refinada",
                "Ambiente acolhedor e atendimento exclusivo",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section id="assistente" className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Assistente de agendamento
          </h2>
          <p className="mt-3 text-muted-foreground">
            Conversa com nossa IA para escolher o serviço e o melhor horário disponível.
          </p>
        </div>
        <BookingAssistant services={services} />
      </section>

      {/* My bookings shortcut */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div>
            <h3 className="text-xl font-semibold text-card-foreground">Já tem um agendamento?</h3>
            <p className="text-sm text-muted-foreground">
              Consulte, cancele ou reagende com seu telefone.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/meus-agendamentos">Meus agendamentos</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 text-center">
        <p className="font-serif text-2xl font-semibold text-foreground">Sabrine Beauty Flow</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Design de sobrancelhas com amor e técnica.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>@sabrine_sobrancelhas</span>
        </div>
      </footer>
    </div>
  );
}

function BookingAssistant({
  services,
}: {
  services: Awaited<ReturnType<typeof listServices>>;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Olá! ✨ Sou a assistente do Sabrine Beauty Flow. Posso te ajudar a escolher um serviço e encontrar o melhor horário. O que você gostaria de fazer hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await chatWithAssistant({
        data: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content },
      ]);
    } catch (err) {
      toast.error("Não consegui responder agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex h-[560px] flex-col overflow-hidden border border-border/60 bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MessageCircle className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="font-medium text-foreground">Assistente Sabrine</p>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary text-secondary-foreground rounded-bl-none"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Digitando…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {services.slice(0, 3).map((s) => (
            <button
              key={s.id}
              onClick={() => setInput(`Quero agendar ${s.name}`)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
            >
              {s.name}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => {
              console.log("onChange:", e.target.value);
              setInput(e.target.value);
            }}
            placeholder="Escreva aqui…"
            className="flex-1 rounded-full"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading} className="rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
