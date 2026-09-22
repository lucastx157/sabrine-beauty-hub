import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Clock,
  Sparkles,
  Scissors,
  MessageCircle,
  Phone,
  Instagram,
  Check,
  CalendarDays,
  Crown,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listServices, getAvailableSlots, createBooking } from "@/lib/booking.functions";
import { chatWithAssistant } from "@/lib/ai.functions";
import { formatCurrencyCents } from "@/lib/dates";
import { toast } from "sonner";

const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: () => listServices({ data: undefined }),
});

const slotsQueryOptions = queryOptions({
  queryKey: ["slots", "all"],
  queryFn: () => getAvailableSlots({ data: {} }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sabrine Beauty | Design de Sobrancelhas e Agendamento Online" },
      {
        name: "description",
        content:
          "Agende online design de sobrancelhas, henna, coloração, hydra gloss e brow lamination com a Sabrine Beauty. Veja os dias e horários liberados e confirme no WhatsApp.",
      },
      { property: "og:title", content: "Sabrine Beauty | Design de Sobrancelhas e Agendamento Online" },
      {
        property: "og:description",
        content:
          "Escolha o procedimento, o dia e o horário. A confirmação chega pronta no WhatsApp da Sabrine.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://id-preview--bd17da20-933c-4eb6-bf50-910f94bce894.lovable.app/images/hero.jpg",
      },
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

const WHATSAPP_NUMBER = "5537998598753";
const WHATSAPP_DISPLAY = "(37) 99859-8753";
const INSTAGRAM_URL = "https://instagram.com/sabrine_sobrancelhas";

const shortWeekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Service = Awaited<ReturnType<typeof listServices>>[number];
type Slot = Awaited<ReturnType<typeof getAvailableSlots>>[number];

function priceRange(service: Service) {
  const min = formatCurrencyCents(service.price_min ?? 0);
  if (service.price_max && service.price_max !== service.price_min) {
    return `${min} - ${formatCurrencyCents(service.price_max)}`;
  }
  return min;
}

function durationRange(service: Service) {
  if (service.duration_max && service.duration_max !== service.duration_min) {
    return `${service.duration_min} a ${service.duration_max} min`;
  }
  return `${service.duration_min} min`;
}

function parseDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const date = new Date(y!, m! - 1, d!);
  return {
    weekDay: shortWeekDays[date.getDay()]!,
    day: String(d),
    month: shortMonths[m! - 1]!,
    full: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
  };
}

function weekKey(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const date = new Date(y!, m! - 1, d!);
  const monday = new Date(date);
  const offset = (date.getDay() + 6) % 7;
  monday.setDate(date.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) =>
    `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return `Semana de ${fmt(monday)} a ${fmt(sunday)}`;
}

const specialServices = [
  {
    name: "Micropigmentação de Sobrancelha",
    duration: "1h30 a 2h (varia por cliente)",
    description:
      "Técnica fio a fio ou shadow para definir e corrigir falhas com naturalidade duradoura.",
    icon: Crown,
  },
  {
    name: "Micropigmentação Labial",
    duration: "1h30 a 2h (varia por cliente)",
    description:
      "Revitaliza a cor natural dos lábios, define o contorno e confere aspecto saudável e coradinho.",
    icon: Crown,
  },
  {
    name: "Mentoria",
    duration: "Horário e valor a combinar",
    description: "Aperfeiçoamento profissional em design e técnicas avançadas com a Sabrine.",
    icon: GraduationCap,
  },
];

function HomePage() {
  const { data: services } = useSuspenseQuery(servicesQueryOptions);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const chooseService = (id: string) => {
    setSelectedServiceId(id);
    document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-serif text-lg font-semibold text-primary">
              S
            </span>
            <div className="leading-tight">
              <p className="font-serif text-base font-semibold text-foreground">Sabrine Beauty</p>
              <p className="text-xs text-muted-foreground">Design &amp; Estética</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary sm:flex"
            >
              <Instagram className="h-4 w-4" /> @sabrine_sobrancelhas
            </a>
            <Button asChild size="sm" className="rounded-full">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                Contato
              </a>
            </Button>
          </div>
        </div>
      </header>

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
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-24 lg:py-32">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Excelência em cada detalhe
          </span>
          <h1 className="max-w-2xl font-serif text-4xl leading-tight font-semibold tracking-tight text-foreground md:text-6xl">
            Realce sua beleza natural com <span className="text-gradient-gold">sofisticação</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Especialista em valorizar o seu olhar e lábios com técnicas modernas, segurança e
            atendimento personalizado. Escolha o procedimento, o dia e o horário — a confirmação
            chega pronta no WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <a href="#servicos">Ver serviços e agendar</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Design • Henna • Lamination</p>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Nossos Serviços &amp; Valores
          </h2>
          <p className="mt-3 text-muted-foreground">
            Toque no procedimento desejado para escolher o dia e o horário do seu atendimento.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group flex flex-col overflow-hidden border border-border/60 bg-card shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground">{service.name}</h3>
                <p className="mt-1 text-lg font-semibold text-primary">{priceRange(service)}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Duração: {durationRange(service)}
                </p>
                <p className="mt-4 flex-1 text-sm text-muted-foreground">{service.description}</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-full"
                  onClick={() => chooseService(service.id)}
                >
                  Escolher horário
                </Button>
              </div>
            </Card>
          ))}

          {/* AI helper card */}
          <Card className="flex flex-col justify-between border border-primary/30 bg-primary/5 p-6 shadow-card">
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground">
                Não sabe qual procedimento escolher?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Conte como são suas sobrancelhas ou lábios e o que você deseja. Nossa assistente de
                IA indica o procedimento ideal e mostra os horários livres.
              </p>
            </div>
            <Button asChild className="mt-6 rounded-full">
              <a href="#assistente">Descobrir meu procedimento</a>
            </Button>
          </Card>
        </div>
      </section>

      {/* Booking */}
      <section id="agendamento" className="bg-secondary/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-10 text-center">
            <span className="text-xs font-medium tracking-widest text-primary uppercase">
              Agendamento online
            </span>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Escolha seu dia e horário
            </h2>
          </div>
          <BookingFlow
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
        </div>
      </section>

      {/* Before / After */}
      <section>
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
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Transformação natural e elegante
            </h2>
            <p className="mt-4 text-muted-foreground">
              Cada procedimento é planejado para harmonizar com o seu rosto e estilo. O resultado é
              um olhar mais expressivo, sem perder a naturalidade.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Design personalizado de acordo com seu rosto",
                "Produtos de qualidade e técnica refinada",
                "Ambiente acolhedor e atendimento exclusivo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-foreground">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section id="assistente" className="bg-secondary/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Assistente de agendamento
            </h2>
            <p className="mt-3 text-muted-foreground">
              Converse com nossa IA para escolher o procedimento e o melhor horário disponível.
            </p>
          </div>
          <BookingAssistant />
        </div>
      </section>

      {/* Special services & mentorias */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="text-xs font-medium tracking-widest text-primary uppercase">
            Atendimento exclusivo
          </span>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Serviços Especiais &amp; Mentorias
          </h2>
          <p className="mt-3 text-muted-foreground">
            Procedimentos de alta durabilidade e mentorias profissionais sob consulta direta.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {specialServices.map((item) => (
            <Card key={item.name} className="flex flex-col border border-border/60 bg-card p-6 shadow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">{item.name}</h3>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {item.duration}
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline" className="mt-6 rounded-full">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `Olá Sabrine! Gostaria de consultar sobre ${item.name}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar no PV
                </a>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* My bookings shortcut */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div>
            <h3 className="text-xl font-semibold text-card-foreground">Já tem um agendamento?</h3>
            <p className="text-sm text-muted-foreground">
              Consulte, cancele ou reagende com seu telefone (até 24h antes do atendimento).
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/meus-agendamentos">Meus agendamentos</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center">
          <p className="font-serif text-2xl font-semibold text-foreground">Sabrine Beauty</p>
          <p className="text-sm text-muted-foreground">
            Transformando olhares com elegância e técnica.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-primary"
            >
              <Instagram className="h-4 w-4" /> @sabrine_sobrancelhas
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-primary"
            >
              <Phone className="h-4 w-4" /> {WHATSAPP_DISPLAY}
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sabrine Beauty. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </span>
      <h3 className="text-base font-semibold text-card-foreground">{label}</h3>
    </div>
  );
}

function BookingFlow({
  services,
  selectedServiceId,
  onSelectService,
}: {
  services: Service[];
  selectedServiceId: string | null;
  onSelectService: (id: string) => void;
}) {
  const { data: slots, isLoading, refetch } = useQuery(slotsQueryOptions);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const service = services.find((s) => s.id === selectedServiceId) ?? null;

  const weeks = useMemo(() => {
    const byDate = new Map<string, Slot[]>();
    for (const slot of slots ?? []) {
      const list = byDate.get(slot.date) ?? [];
      list.push(slot);
      byDate.set(slot.date, list);
    }
    const grouped = new Map<string, { date: string; count: number }[]>();
    for (const [d, list] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const key = weekKey(d);
      const arr = grouped.get(key) ?? [];
      arr.push({ date: d, count: list.length });
      grouped.set(key, arr);
    }
    return [...grouped.entries()];
  }, [slots]);

  const dayTimes = useMemo(
    () => (slots ?? []).filter((s) => s.date === date).map((s) => s.time),
    [slots, date],
  );

  const handleConfirm = async () => {
    if (!service || !date || !time || name.trim().length < 2) {
      toast.error("Preencha procedimento, dia, horário e seu nome.");
      return;
    }
    setSaving(true);
    try {
      await createBooking({
        data: {
          serviceId: service.id,
          date,
          time,
          clientName: name.trim(),
          ...(phone.replace(/\D/g, "").length >= 10 ? { clientPhone: phone } : {}),
        },
      });
      const parts = parseDateParts(date);
      const message =
        `Olá Sabrine! Acabei de agendar pelo site.\n\n` +
        `Nome: ${name.trim()}\n` +
        `Procedimento: ${service.name}\n` +
        `Valor: ${priceRange(service)}\n` +
        `Dia: ${parts.weekDay}, ${parts.full}\n` +
        `Horário: ${time}` +
        (note.trim() ? `\nObservação: ${note.trim()}` : "");
      toast.success("Agendamento confirmado! Abrindo o WhatsApp...");
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
      setDate(null);
      setTime(null);
      setNote("");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível agendar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1 */}
      <Card className="border border-border/60 bg-card p-6 shadow-card">
        <StepBadge n={1} label="Procedimento" />
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectService(s.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selectedServiceId === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Step 2 */}
      <Card className="border border-border/60 bg-card p-6 shadow-card">
        <StepBadge n={2} label="Dia disponível" />
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Somente dias e horários liberados pela Sabrine — a semana seguinte abre com uma semana de
          antecedência.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando dias disponíveis...</p>
        ) : weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum horário liberado no momento. Fale com a Sabrine no WhatsApp.
          </p>
        ) : (
          <div className="space-y-5">
            {weeks.map(([label, days]) => (
              <div key={label}>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-primary">
                  <CalendarDays className="h-3.5 w-3.5" /> {label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const p = parseDateParts(d.date);
                    const active = date === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          setDate(d.date);
                          setTime(null);
                        }}
                        className={`flex w-16 flex-col items-center rounded-xl border py-2 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span>{p.weekDay}</span>
                        <span className="text-lg font-semibold">{p.day}</span>
                        <span>{p.month}</span>
                        <span className="mt-1 opacity-70">{d.count} vagas</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Step 3 */}
      <Card className="border border-border/60 bg-card p-6 shadow-card">
        <StepBadge n={3} label="Horário" />
        {!date ? (
          <p className="text-sm text-muted-foreground">Escolha um dia para ver os horários livres.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dayTimes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  time === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Step 4 */}
      <Card className="border border-border/60 bg-card p-6 shadow-card">
        <StepBadge n={4} label="Seus dados" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Seu nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">WhatsApp</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(37) 99999-9999"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-muted-foreground">Observação (opcional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Alguma preferência ou informação importante?"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-secondary/40 p-4 text-sm">
          <p className="mb-3 font-semibold text-foreground">Resumo do agendamento</p>
          <dl className="space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <dt>Procedimento:</dt>
              <dd className="text-foreground">{service?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Valor:</dt>
              <dd className="text-foreground">{service ? priceRange(service) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Dia:</dt>
              <dd className="text-foreground">
                {date ? `${parseDateParts(date).weekDay}, ${parseDateParts(date).full}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Horário:</dt>
              <dd className="text-foreground">{time ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <Button
          className="mt-6 w-full rounded-full"
          size="lg"
          disabled={saving}
          onClick={handleConfirm}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          {saving ? "Confirmando..." : "Confirmar agendamento no WhatsApp"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          O horário é reservado na agenda e a mensagem é gerada automaticamente com procedimento,
          valor, dia e horário.
        </p>
        <p className="mt-2 flex items-start gap-2 text-center text-xs text-muted-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Cancelamento ou reagendamento apenas até 24 horas antes do horário marcado — a vaga é
          liberada na hora para outra cliente.
        </p>
      </Card>
    </div>
  );
}

function BookingAssistant() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Olá! ✨ Sou a assistente da Sabrine Beauty. Me conte como são suas sobrancelhas ou lábios e o que você deseja — eu indico o procedimento ideal e mostro os dias e horários livres.",
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
      setMessages((prev) => [...prev, { role: "assistant", content: response.content }]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não consegui responder agora. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Quais procedimentos vocês oferecem?",
    "Quais horários estão livres?",
    "Minhas sobrancelhas têm falhas, o que indica?",
  ];

  return (
    <Card className="flex h-[520px] flex-col overflow-hidden border border-border/60 bg-card shadow-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm whitespace-pre-line text-primary-foreground"
                  : "max-w-[85%] text-sm whitespace-pre-line text-foreground"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <p className="animate-pulse text-sm text-muted-foreground">Pensando...</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Escreva sua mensagem..."
            disabled={isLoading}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="rounded-full"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
