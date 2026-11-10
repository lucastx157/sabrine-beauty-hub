import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarHeart, Crown, Download, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrowBeautyCard, saveCardImage } from "@/components/BrowBeautyCard";
import { getLoyalty, BROW_BEAUTY_MONTHS } from "@/lib/loyalty.functions";
import { loadClient, saveClient } from "@/lib/client-storage";

export const Route = createFileRoute("/cartao")({
  head: () => ({
    meta: [
      { title: "Cartão Brow Beauty | Sabrine Beauty" },
      { name: "description", content: "Acumule pontos a cada agendamento pago e conquiste o Cartão Brow Beauty com 6 meses seguidos." },
      { property: "og:title", content: "Cartão Brow Beauty | Sabrine Beauty" },
      { property: "og:description", content: "Pontos a cada agendamento e um cartão exclusivo para clientes fiéis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardPage,
});

type Loyalty = Awaited<ReturnType<typeof getLoyalty>>;

function CardPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const lookup = async (p: string, silent = false) => {
    const digits = p.replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(digits)) {
      if (!silent) toast.error("Digite seu WhatsApp com DDD.");
      return;
    }
    setLoading(true);
    try {
      const res = await getLoyalty({ data: { phone: digits } });
      setLoyalty(res);
      setName((n) => n || res.firstName);
      saveClient({ phone: digits });
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Não foi possível consultar agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = loadClient();
    if (saved.name) setName(saved.cardName || saved.name.split(/\s+/)[0] || "");
    if (saved.phone) {
      setPhone(saved.phone);
      void lookup(saved.phone, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    if (!svgRef.current) return;
    setSaving(true);
    saveClient({ cardName: name.trim() });
    try {
      const r = await saveCardImage(svgRef.current, `cartao-brow-beauty-${(name || "cliente").trim().toLowerCase().replace(/\s+/g, "-")}.png`);
      if (r === "downloaded") toast.success("Cartão salvo! Confira nas suas fotos ou downloads.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o cartão.");
    } finally {
      setSaving(false);
    }
  };

  const streak = loyalty?.currentStreak ?? 0;
  const unlocked = loyalty?.unlocked ?? false;
  const missing = Math.max(BROW_BEAUTY_MONTHS - streak, 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
        <span className="font-serif text-lg">Sabrine Beauty<span className="text-gold">.</span></span>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 pb-16 pt-4 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* Cartão */}
        <div className="lg:sticky lg:top-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Clube Sabrine Beauty</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
            Seu Cartão <em className="text-gold-dark">Brow Beauty</em>
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Ganhe pontos a cada agendamento pago e conquiste o cartão exclusivo das clientes fiéis: 6 meses seguidos com a Sabrine.
          </p>

          <div className="mt-6">
            <BrowBeautyCard
              ref={svgRef}
              name={name}
              unlocked={unlocked}
              streak={streak}
              goal={BROW_BEAUTY_MONTHS}
              memberSince={loyalty?.memberSince}
              points={loyalty?.points ?? 0}
            />
          </div>

          <div className="mt-5 space-y-3">
            <label className="block text-sm font-medium" htmlFor="card-name">Nome no cartão</label>
            <Input
              id="card-name"
              placeholder="Digite seu nome"
              value={name}
              maxLength={26}
              onChange={(e) => setName(e.target.value)}
            />
            <Button size="lg" className="h-13 w-full rounded-md text-base" disabled={saving || !name.trim()} onClick={() => void onSave()}>
              <Download className="mr-2 h-5 w-5" /> {saving ? "Gerando…" : "Salvar e compartilhar meu cartão"}
            </Button>
          </div>
        </div>

        {/* Pontos */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="font-serif text-xl">Consultar meus pontos</p>
            <p className="mt-1 text-sm text-muted-foreground">Use o mesmo WhatsApp do agendamento.</p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(phone);
              }}
            >
              <Input
                placeholder="(37) 99999-9999"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-label="WhatsApp com DDD"
              />
              <Button type="submit" disabled={loading} className="shrink-0">
                {loading ? "…" : "Ver"}
              </Button>
            </form>

            {loyalty && (
              <div className="mt-6 space-y-5">
                {!loyalty.found && (
                  <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    Ainda não há agendamentos pagos com esse número. Seus pontos começam no primeiro horário marcado pelo site.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary p-4 text-primary-foreground">
                    <Star className="h-4 w-4 text-gold" />
                    <p className="mt-2 font-serif text-3xl">{loyalty.points.toLocaleString("pt-BR")}</p>
                    <p className="text-xs opacity-80">pontos</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <CalendarHeart className="h-4 w-4 text-gold" />
                    <p className="mt-2 font-serif text-3xl">{loyalty.visits}</p>
                    <p className="text-xs text-muted-foreground">{loyalty.visits === 1 ? "atendimento" : "atendimentos"}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">Meses seguidos</span>
                    <span className="text-muted-foreground">{Math.min(streak, BROW_BEAUTY_MONTHS)} de {BROW_BEAUTY_MONTHS}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-1.5" aria-hidden="true">
                    {Array.from({ length: BROW_BEAUTY_MONTHS }).map((_, i) => (
                      <span key={i} className={`h-2 rounded-full ${i < streak ? "bg-gold" : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-sm">
                    {unlocked ? (
                      <><Crown className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> Parabéns! Você conquistou o Cartão Brow Beauty.</>
                    ) : (
                      <><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> Faltam {missing} {missing === 1 ? "mês" : "meses"} seguidos para acender seu cartão.</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gold/50 p-6">
            <p className="font-serif text-xl">Como funciona</p>
            <ol className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
                <span><b>Agende e pague pelo site.</b> Cada R$ 1 pago vira 1 ponto, assim que o pagamento é aprovado.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                <span><b>Venha todo mês.</b> Cada mês com atendimento soma uma bolinha no seu cartão.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
                <span><b>6 meses seguidos:</b> seu Cartão Brow Beauty acende em rose gold. Salve e mostre no atendimento.</span>
              </li>
            </ol>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/" hash="agendamento">Agendar e ganhar pontos</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
