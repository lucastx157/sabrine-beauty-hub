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
  Award,
  Medal,
  Trophy,
  Star,
  ArrowRight,
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

const awards = [
  {
    icon: Trophy,
    title: "Mentoria Avançada em Design",
    description: "Certificação em técnicas exclusivas de visagismo e design personalizado.",
  },
  {
    icon: Award,
    title: "Campeã de Sobrancelhas",
    description: "Reconhecimento em competições regionais pela precisão e naturalidade dos resultados.",
  },
  {
    icon: Medal,
    title: "Especialista em Micropigmentação",
    description: "Formação contínua em fio a fio, shadow e lábios com os melhores mestres do Brasil.",
  },
];

const gallery = [
  {
    image: "/images/procedure-microblading.jpg",
    title: "Microblanding Flow",
    subtitle: "Fios hiper-realistas",
    description: "Técnica de fios ultra-finos desenhados um a um para preencher falhas e criar sobrancelhas naturais e harmoniosas.",
  },
  {
    image: "/images/procedure-brow-lamination.jpg",
    title: "Brow Lamination",
    subtitle: "Volume e alinhamento",
    description: "Alinhamento dos fios naturais para um efeito volumoso, moderno e sofisticado que dura semanas.",
  },
  {
    image: "/images/procedure-design-henna.jpg",
    title: "Design com Henna",
    subtitle: "Cor e definição",
    description: "Mapeamento facial + henna premium para preencher e definir o contorno ideal do seu olhar.",
  },
];

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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient light orbs */}
      <div className="light-orb -top-[20%] -left-[10%] h-[60%] w-[60%] bg-rose/20" />
      <div className="light-orb -bottom-[10%] -right-[10%] h-[50%] w-[50%] bg-gold/15" />
      <div className="light-orb top-[40%] left-[30%] h-[30%] w-[30%] bg-gold/10" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold-shine font-serif text-lg font-semibold text-primary-foreground shadow-gold">
              S
            </span>
            <div className="leading-tight">
              <p className="font-serif text-base font-semibold text-foreground">Sabrine Beauty</p>
              <p className="text-xs text-muted-foreground">Design &amp; Estética</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary sm:flex"
            >
              <Instagram className="h-4 w-4" /> @sabrine_sobrancelhas
            </a>
            <Button asChild size="sm" className="rounded-full shadow-gold">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                Contato
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center px-6 py-20">
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Excelência em cada detalhe
            </div>
            <h1 className="font-serif text-5xl leading-[1.1] font-semibold tracking-tight text-foreground md:text-7xl">
              A Essência do <br />
              <span className="text-gradient-gold italic">Olhar Perfeito</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg text-muted-foreground leading-relaxed">
              Transformações personalizadas que elevam sua beleza natural ao nível da arte. Técnica
              exclusiva Sabrine para sobrancelhas e lábios que harmonizam com o seu rosto.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="rounded-full px-8 shadow-gold">
                <a href="#agendamento">Agendar agora</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                  Ver no Instagram
                </a>
              </Button>
            </div>
            <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-primary text-primary" /> +2.000 procedimentos
              </span>
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Especialista certificada
              </span>
            </div>
          </div>

          <div className="perspective-1000 relative flex justify-center lg:justify-end">
            <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl animate-pulse" />
            <div className="floating-3d relative w-full max-w-md">
              <img
                src="/images/hero.jpg"
                alt="Design de sobrancelhas"
                className="relative z-10 w-full rounded-2xl shadow-2xl"
                width={1280}
                height={800}
              />
              <div className="absolute -bottom-6 -left-6 z-20 hidden rounded-xl border border-primary/20 bg-card p-5 shadow-card md:block">
                <p className="font-serif text-2xl text-gradient-gold italic">Elegância</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Redefinida</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Sabrine */}
      <section className="relative py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -top-8 -right-8 h-40 w-40 border-r-2 border-t-2 border-primary/20" />
              <img
                src="/images/sabrine.jpg"
                alt="Sabrine Beauty Specialist"
                className="relative z-10 w-full rounded-sm grayscale transition-all duration-1000 hover:grayscale-0 shadow-2xl"
                width={800}
                height={1000}
                loading="lazy"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">A especialista</span>
              <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Sobre a <span className="text-gradient-gold italic">Sabrine</span>
              </h2>
              <p className="mt-6 text-lg leading-loose text-muted-foreground">
                Especialista em visagismo facial e design de sobrancelhas, dedica sua carreira a
                entender a arquitetura do rosto feminino. Com certificações nacionais e
                internacionais, seu toque é suave e seus resultados são memoráveis.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-8 border-t border-border/60 pt-10">
                <div>
                  <span className="block font-serif text-4xl text-foreground">15+</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Especializações</span>
                </div>
                <div>
                  <span className="block font-serif text-4xl text-foreground">2k+</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Procedimentos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Nossos serviços</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Procedimentos &amp; Valores
            </h2>
            <p className="mt-4 text-muted-foreground">
              Toque no procedimento desejado para escolher o dia e o horário do seu atendimento.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card
                key={service.id}
                className="group flex flex-col overflow-hidden border border-border/60 bg-card/80 shadow-card transition-all hover:-translate-y-2 hover:shadow-gold"
              >
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                    className="mt-6 rounded-full group/btn"
                    onClick={() => chooseService(service.id)}
                  >
                    Escolher horário
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </Card>
            ))}

            {/* AI helper card */}
            <Card className="flex flex-col justify-between border border-primary/30 bg-primary/5 p-6 shadow-card transition-all hover:-translate-y-2 hover:shadow-gold">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
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
        </div>
      </section>

      {/* Booking */}
      <section id="agendamento" className="relative py-32 bg-secondary/30">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Agendamento online</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Escolha seu dia e horário
            </h2>
            <p className="mt-4 text-muted-foreground">
              Os horários são liberados pela Sabrine com uma semana de antecedência.
            </p>
          </div>
          <BookingFlow
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
          />
        </div>
      </section>

      {/* Awards */}
      <section className="relative overflow-hidden bg-brown py-28">
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, oklch(0.9 0.1 80) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Excelência e reconhecimento</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-primary-foreground md:text-5xl">
              Certificados e Prêmios
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {awards.map((award, i) => (
              <Card
                key={award.title}
                className="glass-card group p-8 transition-all hover:-translate-y-3 hover:shadow-gold"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <award.icon className="h-6 w-6" />
                </div>
                <div className="mb-4 font-serif text-3xl italic text-primary">0{i + 1}</div>
                <h4 className="font-serif text-xl text-primary-foreground">{award.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
                  {award.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Results Gallery */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Resultados reais</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Galeria de <span className="text-gradient-gold italic">Resultados</span>
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <div key={item.title} className="group">
                <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    width={800}
                    height={1000}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-brown/90 to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-sm italic leading-relaxed text-white/90">{item.description}</p>
                  </div>
                </div>
                <h4 className="font-serif text-xl text-foreground">{item.title}</h4>
                <p className="text-xs uppercase tracking-widest text-primary">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section id="assistente" className="relative py-32 bg-secondary/30">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Assistente virtual</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Tire suas dúvidas com a IA
            </h2>
            <p className="mt-4 text-muted-foreground">
              Converse com nossa assistente para escolher o procedimento e o melhor horário disponível.
            </p>
          </div>
          <BookingAssistant />
        </div>
      </section>

      {/* Special services & mentorias */}
      <section className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Atendimento exclusivo</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Serviços Especiais &amp; Mentorias
            </h2>
            <p className="mt-4 text-muted-foreground">
              Procedimentos de alta durabilidade e mentorias profissionais sob consulta direta.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {specialServices.map((item) => (
              <Card key={item.name} className="flex flex-col border border-border/60 bg-card/80 p-6 shadow-card transition-all hover:-translate-y-2 hover:shadow-gold">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
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
        </div>
      </section>

      {/* My bookings shortcut */}
      <section className="border-t border-border bg-card/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-12 md:flex-row">
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
      <footer className="relative bg-background py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 text-center">
          <p className="font-serif text-3xl font-semibold text-foreground">Sabrine Beauty</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Transformando olhares com elegância, técnica e muito cuidado em cada procedimento.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
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
          <p className="mt-8 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sabrine Beauty. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Floating actions */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_0_30px_rgba(37,211,102,0.35)] transition-transform hover:scale-110 animate-float"
          aria-label="WhatsApp"
        >
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
        <a
          href="#assistente"
          className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-brown text-primary shadow-2xl transition-all hover:bg-primary hover:text-primary-foreground"
          aria-label="Assistente de agendamento"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      </div>
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
          ...(note.trim() ? { notes: note.trim() } : {}),
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
      <Card className="border border-border/60 bg-card/80 p-6 shadow-card">
        <StepBadge n={1} label="Procedimento" />
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectService(s.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selectedServiceId === s.id
                  ? "border-primary bg-primary text-primary-foreground shadow-gold"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Step 2 */}
      <Card className="border border-border/60 bg-card/80 p-6 shadow-card">
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
                            ? "border-primary bg-primary text-primary-foreground shadow-gold"
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
      <Card className="border border-border/60 bg-card/80 p-6 shadow-card">
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
                    ? "border-primary bg-primary text-primary-foreground shadow-gold"
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
      <Card className="border border-border/60 bg-card/80 p-6 shadow-card">
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

        <Button className="mt-6 w-full rounded-full" size="lg" disabled={saving} onClick={handleConfirm}>
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
    <Card className="flex h-[520px] flex-col overflow-hidden border border-border/60 bg-card/80 shadow-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] whitespace-pre-line rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "max-w-[85%] whitespace-pre-line text-sm text-foreground"
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
          <Button onClick={() => void handleSend()} disabled={isLoading || !input.trim()} className="rounded-full" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
