import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAvailableSlots, requestBooking, listServices } from "@/lib/booking.functions";
import { formatCurrencyCents } from "@/lib/dates";
import { toast } from "sonner";

type Service = Awaited<ReturnType<typeof listServices>>[number];

export const PIX_KEY = "37998598753";
const WHATSAPP_NUMBER = "5537998598753";
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
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otherPerson, setOtherPerson] = useState(false);
  const [attendee, setAttendee] = useState("");
  const [showPix, setShowPix] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["slots", selectedServiceId],
    queryFn: () => getAvailableSlots({ data: selectedServiceId ? { serviceId: selectedServiceId } : {} }),
    enabled: !!selectedServiceId,
  });

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots) {
      if (s.occupied) continue;
      map.set(s.date, [...(map.get(s.date) ?? []), s.time]);
    }
    return Array.from(map.entries());
  }, [slots]);

  useEffect(() => {
    setDate(null);
    setTime(null);
    setShowPix(false);
    setDone(false);
  }, [selectedServiceId]);

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

  const sendProof = async () => {
    if (!service || !date || !time) return;
    // Abre a janela já no clique para o celular não bloquear o WhatsApp.
    const win = window.open("", "_blank");
    setSending(true);
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
    } catch (e) {
      win?.close();
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
                {s.deposit_cents ? `Sinal ${formatCurrencyCents(s.deposit_cents)} no Pix` : formatCurrencyCents(s.price_min ?? 0)}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* 2. Dia e horário */}
      {service && (
        <div>
          <h3 className="mb-1 font-serif text-xl text-foreground">2. Dia e horário</h3>
          <p className="mb-3 text-xs text-muted-foreground">Só aparecem os horários livres (em verde).</p>
          {isLoading ? (
            <p className="animate-pulse text-sm text-muted-foreground">Carregando horários...</p>
          ) : days.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem horários livres no momento. Chame a Sabrine no WhatsApp.</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {days.map(([d, times]) => {
                  const p = dateParts(d);
                  return (
                    <Button variant="outline"
                      key={d}
                      type="button"
                      aria-label={`Dia ${p.label}`}
                      onClick={() => { setDate(d); setTime(null); }}
                      className={`flex h-auto min-w-[72px] shrink-0 flex-col items-center rounded-md border px-3 py-2 text-sm ${
                        d === date ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      }`}
                    >
                      <span className="text-xs">{p.wd}</span>
                      <span className="text-lg font-semibold">{p.day}</span>
                      <span className="text-xs">{p.month}</span>
                      <span className="mt-1 text-[10px]">{times.length} {times.length === 1 ? "vaga" : "vagas"}</span>
                    </Button>
                  );
                })}
              </div>
              {date && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(days.find(([d]) => d === date)?.[1] ?? []).map((t) => (
                    <Button variant="outline"
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={`h-11 rounded-md border-2 py-2 text-sm font-semibold transition-colors ${
                        t === time
                          ? "border-success bg-success text-success-foreground"
                          : "border-success/60 bg-success/10 text-success hover:bg-success/20"
                      }`}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 3. Dados */}
      {service && (
        <div className="space-y-3">
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
          <Button size="lg" className="h-14 w-full rounded-md text-base" onClick={goToPix}>
            Continuar para o pagamento Pix
          </Button>
          {missing.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Falta preencher: {missing.join(", ")}.
            </p>
          )}
        </div>
      )}

      {service && showPix && date && time && (
        <div className="space-y-4 rounded-md border border-primary/40 bg-primary/5 p-5">
          <h3 className="font-serif text-xl text-foreground">4. Pagamento via Pix</h3>
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
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Chave Pix (celular) · Recebedora: Sabrine</p>
            <p className="font-mono text-lg font-semibold text-foreground">{PIX_KEY}</p>
            <Button variant="outline" className="mt-3 w-full rounded-md" onClick={() => void copyPix()}>
              <Copy className="mr-2 h-4 w-4" /> Copiar chave Pix
            </Button>
          </div>
          <Button size="lg" disabled={sending} className="h-14 w-full rounded-md text-base" onClick={() => void sendProof()}>
            {sending ? "Enviando..." : "Já paguei, enviar comprovante"}
          </Button>
          <p className="text-center text-sm font-semibold text-foreground">
            Seu horário só está marcado depois do ok da Sabrine (até 8 horas).
          </p>
          <Button variant="outline" type="button" className="h-auto w-full border-0 bg-transparent text-xs text-muted-foreground underline" onClick={() => setShowPix(false)}>
            Voltar e alterar dados
          </Button>
        </div>
      )}

      {/* Regras */}
      <div className="rounded-md border border-border bg-card/60 p-5 text-sm text-muted-foreground">
        <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Regras do agendamento
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A vaga só é garantida com o Pix pago e o comprovante enviado.</li>
          <li>Remarcação com no mínimo 24h de aviso — o valor pago vale para o novo horário.</li>
          <li>Falta ou aviso com menos de 24h: o valor não é devolvido.</li>
          <li>Tolerância de 15 minutos de atraso.</li>
          <li>Se duas pessoas pagarem o mesmo horário, fica quem mandou o comprovante primeiro.</li>
        </ul>
      </div>

      <div className="border-t border-gold pt-6 text-center text-foreground">
        <p className="font-serif text-lg">Fiquem ligadas!</p>
        <p className="mt-1 text-sm font-medium">A agenda da próxima semana sai no domingo de manhã.</p>
      </div>
    </div>
  );
}
