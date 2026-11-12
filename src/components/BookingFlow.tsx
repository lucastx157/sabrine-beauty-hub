import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, AlertCircle, ShieldCheck, CreditCard, Users, CalendarClock, Timer, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAvailableSlots, requestBooking, listServices } from "@/lib/booking.functions";
import { formatCurrencyCents } from "@/lib/dates";
import { createCheckout, getPaymentOptions } from "@/lib/payment.functions";
import { PIX_KEY, pixCopiaECola, pixQrImageUrl } from "@/lib/pix";
import { pointsForCents } from "@/lib/loyalty.functions";
import { loadClient, saveClient } from "@/lib/client-storage";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Service = Awaited<ReturnType<typeof listServices>>[number];

export { PIX_KEY };
const WHATSAPP_NUMBER = "5537998598753";
const CARD_BRANDS = ["Visa", "Mastercard", "Elo", "Hipercard", "American Express", "Hiper"];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function dueNow(s: Service) {
  return s.deposit_cents ?? s.price_min ?? 0;
}

function dateParts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return { wd: weekDays[dt.getDay()]!, day: d!, month: months[m! - 1]!, label: `${weekDays[dt.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
}

export function BookingFlow({
  services,
  selectedServiceId,
  onSelectService,
}: {
  services: Service[];
  selectedServiceId: string | null;
  onSelectService: (id: string) => void;
}) {
  const service = services.find((s) => s.id === selectedServiceId) ?? null;
  const queryClient = useQueryClient();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otherPerson, setOtherPerson] = useState(false);
  const [attendee, setAttendee] = useState("");
  const [showPix, setShowPix] = useState(false);
  const [agree, setAgree] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const { data: paymentOptions } = useQuery({
    queryKey: ["payment-options"],
    queryFn: () => getPaymentOptions(),
    staleTime: 5 * 60_000,
  });
  const cardOnline = paymentOptions?.cardOnline ?? false;

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["slots", selectedServiceId],
    queryFn: () =>
      getAvailableSlots({
        data: selectedServiceId ? { serviceId: selectedServiceId, includeOccupied: true } : { includeOccupied: true },
      }),
    enabled: !!selectedServiceId,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  // Agenda completa do dia: horários livres e ocupados (ocupados só para exibição).
  const days = useMemo(() => {
    const map = new Map<string, { time: string; occupied: boolean }[]>();
    for (const s of slots) {
      map.set(s.date, [...(map.get(s.date) ?? []), { time: s.time, occupied: s.occupied }]);
    }
    return Array.from(map.entries()).map(([d, times]) => ({
      date: d,
      times,
      free: times.filter((t) => !t.occupied).length,
    }));
  }, [slots]);

  useEffect(() => {
    setDate(null);
    setTime(null);
    setShowPix(false);
    setDone(false);
  }, [selectedServiceId]);

  // Agilidade: cliente que já agendou neste aparelho não precisa digitar de novo.
  useEffect(() => {
    const saved = loadClient();
    if (saved.name) setName((n) => n || saved.name!);
    if (saved.phone) setPhone((p) => p || saved.phone!);
  }, []);

  // Agilidade: já abre no primeiro dia com horário livre.
  useEffect(() => {
    if (date || days.length === 0) return;
    const first = days.find((d) => d.free > 0);
    if (first) setDate(first.date);
  }, [days, date]);

  const pickTime = (t: string) => {
    setTime(t);
    // Leva a cliente direto para o próximo passo.
    requestAnimationFrame(() =>
      document.getElementById("passo-dados")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const phoneDigits = phone.replace(/\D/g, "");

  const computeMissing = () => {
    const m: string[] = [];
    if (!service) m.push("procedimento");
    if (!date) m.push("dia");
    if (!time) m.push("horário");
    if (name.trim().length < 2) m.push("seu nome");
    if (!/^\d{10,11}$/.test(phoneDigits)) m.push("WhatsApp com DDD");
    if (otherPerson && attendee.trim().length < 2) m.push("nome de quem vai fazer");
    return m;
  };

  const goToPix = () => {
    const m = computeMissing();
    setMissing(m);
    if (m.length === 0) setShowPix(true);
  };

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      toast.success("Chave Pix copiada!");
    } catch {
      toast.message(`Chave Pix: ${PIX_KEY}`);
    }
  };

  const pixCode = service ? pixCopiaECola(dueNow(service)) : "";

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      toast.success("Código Pix copia e cola copiado!");
    } catch {
      toast.message("Selecione e copie o código abaixo do QR Code.");
    }
  };

  const askCardLink = async () => {
    if (!service || !date || !time) return;
    const win = window.open("", "_blank");
    setSending(true);
    try {
    await requestBooking({ data: { serviceId: service.id, date, time, clientName: name.trim(), clientPhone: phoneDigits, paymentMethod: "card", ...(otherPerson ? { attendeeName: attendee.trim() } : {}) } });
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
    const lines = [
      "Olá Sabrine! Quero pagar meu agendamento com cartão:",
      `• Procedimento: ${service.name}`,
      `• Dia: ${dateParts(date).label}`,
      `• Horário: ${time}`,
      `• Nome: ${name.trim()}`,
      `• Valor: ${formatCurrencyCents(dueNow(service))}`,
      "",
      "Pode me enviar o link de pagamento?",
    ];
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
    if (win) win.location.href = url;
    else window.location.href = url;
    setShowPix(false);
    setTime(null);
    } catch (e) {
      win?.close();
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar o pedido.");
    } finally {
      setSending(false);
    }
  };

  const payOnline = async () => {
    if (!service || !date || !time) return;
    setSending(true);
    saveClient({ name: name.trim(), phone: phoneDigits });
    try {
      const res = await createCheckout({
        data: {
          serviceId: service.id,
          date,
          time,
          clientName: name.trim(),
          clientPhone: phoneDigits,
          ...(otherPerson ? { attendeeName: attendee.trim() } : {}),
        },
      });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o pagamento.");
      setSending(false);
    }
  };

  const sendProof = async () => {
    if (!service || !date || !time) return;
    // Abre a janela já no clique para o celular não bloquear o WhatsApp.
    const win = window.open("", "_blank");
    setSending(true);
    saveClient({ name: name.trim(), phone: phoneDigits });
    try {
      const res = await requestBooking({
        data: {
          serviceId: service.id,
          date,
          time,
          clientName: name.trim(),
          clientPhone: phoneDigits,
          ...(otherPerson ? { attendeeName: attendee.trim() } : {}),
        },
      });
      const lines = [
        "Olá Sabrine! Fiz meu pedido de agendamento pelo site:",
        `• Procedimento: ${service.name}`,
        `• Dia: ${dateParts(date).label}`,
        `• Horário: ${time}`,
        `• Nome: ${name.trim()}`,
        ...(otherPerson ? [`• Quem vai fazer: ${attendee.trim()}`] : []),
        `• WhatsApp: ${phone}`,
        `• Valor pago no Pix: ${formatCurrencyCents(res.amountCents)}`,
        "",
        "Segue o comprovante do Pix 👇",
      ];
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
      if (win) win.location.href = url;
      else window.location.href = url;
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
    } catch (e) {
      win?.close();
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  if (done && service && date && time) {
    return (
      <Card className="glass-card border border-success/40 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-success text-success-foreground">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="font-serif text-2xl text-foreground">Pedido enviado!</h3>
        <p className="mt-3 text-muted-foreground">
          {service.name} · {dateParts(date).label} às {time}. Envie o comprovante na conversa do WhatsApp que abriu.
        </p>
        <p className="mt-3 font-semibold text-foreground">
          Seu horário só está marcado depois do ok da Sabrine (até 8 horas).
        </p>
        <Button variant="outline" className="mt-6 rounded-md" onClick={() => { setDone(false); setShowPix(false); setDate(null); setTime(null); }}>
          Fazer outro agendamento
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* 1. Procedimento */}
      <div>
        <h3 className="mb-3 font-serif text-xl text-foreground">1. Procedimento</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <Button variant="outline"
              key={s.id}
              type="button"
              onClick={() => onSelectService(s.id)}
              className={`h-auto min-h-20 flex-col items-start whitespace-normal rounded-md border p-3 text-left text-sm transition-colors ${
                s.id === selectedServiceId ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <span className="block font-semibold text-foreground">{s.name}</span>
              <span className="text-primary">
                {s.deposit_cents ? `Sinal ${formatCurrencyCents(s.deposit_cents)}` : formatCurrencyCents(s.price_min ?? 0)}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* 2. Dia e horário */}
      {service && (
        <div>
          <h3 className="mb-1 font-serif text-xl text-foreground">2. Dia e horário</h3>
          <p className="mb-3 text-xs text-muted-foreground">Escolha o dia e toque em um horário livre.</p>
          {isLoading ? (
            <p className="animate-pulse text-sm text-muted-foreground">Carregando horários...</p>
          ) : days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem horários no momento. Chame a Sabrine no WhatsApp.</p>
          ) : (
            <>
              <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                {days.map(({ date: d, free }) => {
                  const p = dateParts(d);
                  const full = free === 0;
                  const selected = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-label={`Dia ${p.label}${full ? " — agenda cheia" : ""}`}
                      aria-pressed={selected}
                      onClick={() => { setDate(d); setTime(null); }}
                      className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-3 transition-all ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : full
                            ? "border-border bg-muted/40 text-muted-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="text-[11px] uppercase tracking-wider opacity-80">{p.wd}</span>
                      <span className={`text-xl font-semibold leading-tight ${full && !selected ? "line-through decoration-destructive/70" : ""}`}>{p.day}</span>
                      <span className="text-[11px] opacity-80">{p.month}</span>
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-1.5 w-1.5 rounded-full ${
                          selected ? "bg-primary-foreground" : full ? "bg-destructive/70" : "bg-success"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Tem horário</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-destructive/70" /> Agenda cheia</span>
              </div>
              {date && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(days.find((x) => x.date === date)?.times ?? []).map(({ time: t, occupied }) =>
                    occupied ? (
                      <button
                        key={t}
                        type="button"
                        disabled
                        aria-label={`${t} — ocupado`}
                        className="h-11 cursor-not-allowed rounded-xl border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive/80 line-through decoration-2"
                      >
                        {t}
                      </button>
                    ) : (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={t === time}
                        onClick={() => pickTime(t)}
                        className={`h-11 rounded-xl border-2 text-sm font-semibold transition-colors ${
                          t === time
                            ? "border-success bg-success text-success-foreground shadow-md"
                            : "border-success/60 bg-success/10 text-success hover:bg-success/20"
                        }`}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
              )}
              {date && (
                <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-2 border-success/60 bg-success/10" /> Livre</span>
                  <span className="flex items-center gap-1.5"><span className="text-destructive/80 line-through">00:00</span> Ocupado</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 3. Dados */}
      {service && (
        <div id="passo-dados" className="scroll-mt-24 space-y-3">
          <h3 className="font-serif text-xl text-foreground">3. Seus dados</h3>
          <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} aria-label="Seu nome" />
          <Input placeholder="WhatsApp com DDD — ex: (37) 99999-9999" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="WhatsApp com DDD" />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={otherPerson} onChange={(e) => setOtherPerson(e.target.checked)} />
            Outra pessoa vai fazer o procedimento
          </label>
          {otherPerson && (
            <Input placeholder="Nome de quem vai fazer" value={attendee} onChange={(e) => setAttendee(e.target.value)} aria-label="Nome de quem vai fazer" />
          )}
        </div>
      )}

      {/* 4. Pix */}
      {service && !showPix && (
        <div>
          <label className="mb-3 flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              aria-label="Li e concordo com as regras do agendamento"
            />
            <span>
              Li e concordo com as <button type="button" className="underline underline-offset-2 hover:text-primary" onClick={() => document.getElementById("regras-agendamento")?.scrollIntoView({ behavior: "smooth", block: "center" })}>regras do agendamento</button>.
            </span>
          </label>
          <Button size="lg" disabled={!agree} className="h-14 w-full rounded-md text-base" onClick={goToPix}>
            Continuar para o pagamento
          </Button>
          {!agree && (
            <p className="mt-3 text-xs text-muted-foreground">
              Marque a caixa acima para continuar.
            </p>
          )}
          {missing.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Falta preencher: {missing.join(", ")}.
            </p>
          )}
        </div>
      )}

      {service && showPix && date && time && (
        <div className="space-y-4 rounded-md border border-primary/40 bg-primary/5 p-5">
          <h3 className="font-serif text-xl text-foreground">4. Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            {service.name} · {dateParts(date).label} às {time}
          </p>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Valor a pagar agora</p>
            <p className="font-serif text-3xl text-primary">{formatCurrencyCents(dueNow(service))}</p>
            {service.deposit_cents && (
              <p className="text-xs text-muted-foreground">Sinal para reservar. O restante é pago no dia (Pix ou cartão).</p>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <Star className="h-5 w-5 shrink-0 text-gold" />
            <p className="text-sm">
              Você ganha <b className="text-gold">{pointsForCents(dueNow(service))} pontos</b> no Clube Sabrine Beauty quando o pagamento for aprovado.
            </p>
          </div>
          {/* Pix */}
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <p className="font-semibold text-foreground">Pagar com Pix</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <img
                src={pixQrImageUrl(pixCode)}
                alt="QR Code Pix com o valor do agendamento"
                width={180}
                height={180}
                className="h-44 w-44 shrink-0 rounded-md bg-white p-1"
              />
              <div className="w-full min-w-0 space-y-2 text-sm">
                <p className="text-muted-foreground">Chave Pix (celular)</p>
                <p className="font-serif text-2xl text-foreground">(37) 99859-8753</p>
                <p className="text-xs text-muted-foreground">Recebedora: Sabrine</p>
                <Button type="button" variant="outline" className="w-full rounded-md" onClick={() => void copyPix()}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar chave Pix
                </Button>
                <Button type="button" variant="outline" className="w-full rounded-md" onClick={() => void copyPixCode()}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar Pix copia e cola
                </Button>
              </div>
            </div>
            <p className="break-all rounded-md bg-muted p-2 font-mono text-[11px] text-muted-foreground" aria-label="Código Pix copia e cola">
              {pixCode}
            </p>
            <Button size="lg" disabled={sending} className="h-14 w-full rounded-md text-base" onClick={() => void sendProof()}>
              <Check className="mr-2 h-5 w-5" /> {sending ? "Enviando..." : "Já paguei, enviar comprovante"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              O comprovante vai pelo WhatsApp da Sabrine. Seu horário é confirmado depois que ela conferir o Pix na conta.
            </p>
          </div>

          {/* Cartão */}
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <p className="font-semibold text-foreground">Pagar com cartão</p>
            <div className="flex flex-wrap gap-2">
              {CARD_BRANDS.map((b) => (
                <span key={b} className="rounded border border-border px-2 py-1 text-xs font-medium text-foreground">
                  {b}
                </span>
              ))}
            </div>
            {cardOnline ? (
              <>
                <Button size="lg" variant="outline" disabled={sending} className="h-12 w-full rounded-md" onClick={() => void payOnline()}>
                  <CreditCard className="mr-2 h-5 w-5" /> {sending ? "Abrindo pagamento..." : "Pagar com cartão"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pagamento seguro pelo Mercado Pago. O horário fica reservado por 20 minutos e é confirmado automaticamente quando o pagamento for aprovado.
                </p>
              </>
            ) : (
              <>
                <Button size="lg" variant="outline" disabled={sending} className="h-12 w-full rounded-md" onClick={() => void askCardLink()}>
                  <CreditCard className="mr-2 h-5 w-5" /> Pagar com cartão
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Fale com a Sabrine no WhatsApp para receber o link de pagamento no cartão.
                </p>
              </>
            )}
          </div>
          <Button variant="outline" type="button" className="h-auto w-full border-0 bg-transparent text-xs text-muted-foreground underline" onClick={() => setShowPix(false)}>
            Voltar e alterar dados
          </Button>
        </div>
      )}

      {/* Regras */}
      <div id="regras-agendamento" className="rounded-md border border-gold/60 bg-card p-6 sm:p-8">
        <p className="flex items-center gap-2 font-serif text-xl text-foreground">
          <ShieldCheck className="h-5 w-5 text-gold" /> Leia antes de agendar
        </p>
        <div className="mt-5 space-y-5 text-sm">
          <div className="flex gap-3">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-foreground">Pagamento e confirmação</p>
              <p className="mt-1 text-muted-foreground">
                A vaga só é confirmada depois do pagamento: no Pix, quando a Sabrine confere o valor na conta (envie o comprovante pelo WhatsApp (37) 99859-8753); no cartão, quando o pagamento é aprovado.
                Design sem henna, design com henna, coloração, Hydra Gloss e Brow Lamination: o valor total é pago antecipado.
                Micropigmentação labial e de sobrancelhas: sinal de R$ 100 para reservar; o restante no dia do atendimento, no Pix ou no cartão.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-foreground">Mesmo horário</p>
              <p className="mt-1 text-muted-foreground">
                Se duas pessoas pagarem o mesmo horário, a vaga fica com quem teve o pagamento confirmado primeiro.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-foreground">Remarcação</p>
              <p className="mt-1 text-muted-foreground">
                Pode remarcar avisando com no mínimo 24 horas de antecedência; o valor pago vale para o novo horário.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-foreground">Faltas e avisos em cima da hora</p>
              <p className="mt-1 text-muted-foreground">
                Em caso de falta ou aviso com menos de 24 horas, o valor pago não é devolvido.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-foreground">Atrasos</p>
              <p className="mt-1 text-muted-foreground">
                Tolerância de 15 minutos. Chegue com alguns minutos de antecedência.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="font-semibold text-foreground">Agenda</p>
              <p className="mt-1 text-muted-foreground">
                A agenda sempre muda: novos horários podem abrir a qualquer momento. Fiquem atentas!
              </p>
            </div>
          </div>
        </div>
      </div>

      <Link
        to="/cartao"
        className="group flex items-center gap-4 rounded-2xl border border-gold/60 bg-primary p-5 text-primary-foreground transition-transform hover:-translate-y-0.5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold text-gold">
          <Star className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-serif text-lg">Clube Sabrine Beauty</span>
          <span className="block text-sm opacity-80">Agende, pague e ganhe pontos. 6 meses seguidos = Cartão Brow Beauty.</span>
        </span>
        <span className="text-gold transition-transform group-hover:translate-x-1">→</span>
      </Link>

      <div className="border-t border-gold pt-6 text-center text-foreground">
        <p className="font-serif text-lg">Fiquem atentas aos horários!</p>
        <p className="mt-1 text-sm font-medium">A agenda sempre muda.</p>
      </div>
    </div>
  );
}
