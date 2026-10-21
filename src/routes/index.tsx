import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Clock,
  Sparkles,
  Scissors,
  MessageCircle,
  Phone,
  Instagram,
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
import { listServices } from "@/lib/booking.functions";
import { chatWithAssistant } from "@/lib/ai.functions";
import { formatCurrencyCents } from "@/lib/dates";
import { toast } from "sonner";
import { BookingFlow } from "@/components/BookingFlow";

const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: () => listServices({ data: undefined }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sabrine Beauty | Design de Sobrancelhas em Minas Gerais" },
      {
        name: "description",
        content:
          "Conheça a Sabrine Beauty: design de sobrancelhas, henna, coloração, hydra gloss e brow lamination, prêmios e galeria de resultados.",
      },
      { property: "og:title", content: "Sabrine Beauty | Design de Sobrancelhas em Minas Gerais" },
      {
        property: "og:description",
        content:
          "História, prêmios, galeria e serviços da Sabrine Beauty. Agende online com pagamento via Pix.",
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

function priceRange(service: Service) {
  if (service.price_max && service.price_max > (service.price_min ?? 0) && service.price_note?.startsWith("De ")) {
    return `de ${formatCurrencyCents(service.price_max)} por ${formatCurrencyCents(service.price_min ?? 0)}`;
  }
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

const awards = [
  {
    icon: Trophy,
    image: "/images/premio-palco.jpg",
    title: "Beauty Stars Minas Gerais",
    description: "Premiada no palco do Beauty Stars MG, reconhecimento estadual em design de sobrancelhas.",
  },
  {
    icon: Award,
    image: "/images/premio-trofeu.jpg",
    title: "Troféu Estrela",
    description: "Destaque entre os profissionais da beleza de Minas Gerais pela excelência dos resultados.",
  },
  {
    icon: Medal,
    image: "/images/destaque-rainha.jpg",
    title: "A escolha das personalidades",
    description: "Responsável pela produção da Rainha da Expo Samonte e de clientes em eventos da região.",
  },
];

const gallery = [
  {
    image: "/images/procedure-microblading.jpg",
    title: "Micropigmentação Fio a Fio",
    subtitle: "Fios hiper-realistas",
    description: "Técnica de fios ultra-finos desenhados um a um para preencher falhas e criar sobrancelhas naturais e harmoniosas.",
  },
  {
    image: "/images/procedure-design-henna.jpg",
    title: "Design com Henna",
    subtitle: "Cor e definição",
    description: "Mapeamento facial + henna premium para preencher e definir o contorno ideal do seu olhar.",
  },
  {
    image: "/images/procedure-labial.jpg",
    title: "Micropigmentação Labial",
    subtitle: "Lábios definidos",
    description: "Contorno desenhado e cor natural revitalizada, com acabamento hidratado e aspecto saudável.",
  },
  {
    image: "/images/destaque-rainha.jpg",
    title: "Produção Especial",
    subtitle: "Rainha Expo Samonte",
    description: "Sobrancelhas e produção para eventos e concursos, com acabamento impecável em cada detalhe.",
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

  // Sempre abrir no topo (exceto links com #).
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  const goToBooking = (serviceId?: string) => {
    if (serviceId) setSelectedServiceId(serviceId);
    document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              <Button size="lg" className="rounded-full px-8 shadow-gold" onClick={() => goToBooking()}>
                Agendar agora
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
                  {service.price_note && (
                    <p className="mt-3 text-xs text-muted-foreground">{service.price_note}</p>
                  )}
                  <Button variant="outline" className="mt-6 rounded-full group/btn" onClick={() => goToBooking(service.id)}>
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
                  IA indica o procedimento ideal para você.
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
      <section id="agendamento" className="relative scroll-mt-20 overflow-hidden py-24 bg-secondary/30">
        <div className="light-orb top-0 left-1/4 h-64 w-64 bg-gold/20" />
        <div className="relative mx-auto max-w-3xl px-4 md:px-6">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Agendamento online</span>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Agende seu <span className="text-gradient-gold italic">horário</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Escolha o procedimento, o dia e o horário livre, pague no Pix e envie o comprovante.
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
                className="glass-card group overflow-hidden p-0 transition-all hover:-translate-y-3 hover:shadow-gold"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={award.image}
                    alt={award.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    width={800}
                    height={1000}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brown/80 via-transparent to-transparent" />
                  <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-white shadow-gold">
                    <award.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="p-8">
                  <div className="mb-3 font-serif text-3xl italic text-primary">0{i + 1}</div>
                  <h4 className="font-serif text-xl text-primary-foreground">{award.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
                    {award.description}
                  </p>
                </div>
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
              Converse com nossa assistente para tirar dúvidas e descobrir o procedimento ideal.
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

function BookingAssistant() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Olá! ✨ Sou a assistente da Sabrine Beauty. Me conte como são suas sobrancelhas ou lábios e o que você deseja — eu indico o procedimento ideal e tiro suas dúvidas.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSent = useRef(false);

  // Rola só dentro da caixa do chat, e só depois que a cliente enviou mensagem.
  useEffect(() => {
    if (!hasSent.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    hasSent.current = true;
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
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
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
