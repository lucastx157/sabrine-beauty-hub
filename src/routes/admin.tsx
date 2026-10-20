import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getAdminBookings,
  getDateSlots,
  toggleSlotBlocked,
  addDateSlot,
  setDayBlocked,
  deleteDateSlot,
  getAppConfig,
  updateAppConfig,
  updateBookingStatus,
} from "@/lib/admin.functions";
import { formatDisplayDate, formatCurrencyCents, formatPhone } from "@/lib/dates";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo | Sabrine Beauty Flow" },
      { name: "description", content: "Gestão de disponibilidade e agendamentos." },
      { property: "og:title", content: "Painel Administrativo | Sabrine Beauty Flow" },
      { property: "og:description", content: "Gestão de disponibilidade e agendamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return <div className="p-10 text-center">Carregando…</div>;
  }

  if (!session) {
    return <AdminLogin onLogin={(s) => setSession(s)} />;
  }

  return <AdminDashboard />;
}

function AdminLogin({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) onLogin(data.session);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md p-8 shadow-card">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link to="/">Voltar ao site</Link>
        </Button>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Acesso administrativo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com o e-mail e senha configurados no setup.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getAdminBookings>>>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [b, c] = await Promise.all([
        getAdminBookings({ data: undefined }),
        getAppConfig({ data: undefined }),
      ]);
      setBookings(b);
      setConfig(c);
    } catch {
      toast.error("Erro ao carregar painel. Verifique se você tem permissão de admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <div className="p-10 text-center">Carregando painel…</div>;
  const newCount = bookings.filter((b) => b.status === "requested").length;

  return (
    <div className="min-h-screen bg-background px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-semibold text-foreground">Painel Sabrine</h1>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()} className="rounded-full">
            Sair
          </Button>
        </div>

        <Tabs defaultValue="week" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 rounded-full bg-secondary p-1">
            <TabsTrigger value="week" className="rounded-full">Semana</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-full">
              Pedidos{newCount > 0 ? ` (${newCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-full">Ajustes</TabsTrigger>
          </TabsList>

          <TabsContent value="week">
            <WeekPanel />
          </TabsContent>
          <TabsContent value="bookings">
            <BookingsPanel bookings={bookings} onChanged={() => void getAdminBookings({ data: undefined }).then(setBookings)} />
          </TabsContent>
          <TabsContent value="config">
            <ConfigPanel config={config} onSaved={load} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type DateSlot = Awaited<ReturnType<typeof getDateSlots>>[number];

function WeekPanel() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<DateSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTimes, setNewTimes] = useState<Record<string, string>>({});
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const key = (d: Date) => format(d, "yyyy-MM-dd");

  const load = async () => {
    try {
      setSlots(await getDateSlots({ data: { from: key(days[0]!), to: key(days[6]!) } }));
    } catch {
      toast.error("Erro ao carregar horários.");
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹ Anterior</Button>
        <p className="text-sm font-medium text-foreground">
          {format(days[0]!, "dd/MM")} a {format(days[6]!, "dd/MM")}
        </p>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Próxima ›</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Toque no horário para alternar: <span className="font-semibold text-success">verde = livre</span>,{" "}
        <span className="font-semibold text-destructive">vermelho = bloqueado</span>.
      </p>

      {days.map((d) => {
        const k = key(d);
        const daySlots = slots.filter((s) => s.available_date === k);
        const allBlocked = daySlots.length > 0 && daySlots.every((s) => s.is_blocked);
        return (
          <Card key={k} className="p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-semibold capitalize text-foreground">
                {format(d, "EEEE dd/MM", { locale: ptBR })}
              </p>
              {daySlots.length > 0 && (
                <Button
                  size="sm"
                  variant={allBlocked ? "default" : "outline"}
                  disabled={busy}
                  onClick={() => run(() => setDayBlocked({ data: { date: k, blocked: !allBlocked } }))}
                >
                  {allBlocked ? "Liberar dia" : "Fechar dia"}
                </Button>
              )}
            </div>
            {daySlots.length === 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">Sem horários neste dia.</p>
            ) : (
              <div className="mb-3 flex flex-wrap gap-2">
                {daySlots.map((s) => (
                  <div key={s.id} className="flex items-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => toggleSlotBlocked({ data: { id: s.id, blocked: !s.is_blocked } }))}
                      className={`rounded-l-full px-4 py-2 text-sm font-semibold ${
                        s.is_blocked
                          ? "bg-destructive/15 text-destructive line-through"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      {s.start_time}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Apagar ${s.start_time}`}
                      onClick={() => {
                        if (confirm(`Apagar o horário ${s.start_time}?`)) void run(() => deleteDateSlot({ data: { id: s.id } }));
                      }}
                      className="rounded-r-full bg-muted px-2.5 py-2 text-sm text-muted-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="time"
                step={1800}
                value={newTimes[k] ?? ""}
                onChange={(e) => setNewTimes({ ...newTimes, [k]: e.target.value })}
                className="w-32"
                aria-label={`Novo horário ${k}`}
              />
              <Button
                size="sm"
                disabled={busy || !newTimes[k]}
                onClick={() =>
                  run(async () => {
                    await addDateSlot({ data: { date: k, time: newTimes[k]!.slice(0, 5) } });
                    setNewTimes({ ...newTimes, [k]: "" });
                  })
                }
              >
                + Adicionar horário
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  requested: "Novo pedido – conferir comprovante",
  pending_payment: "Aguardando confirmação do pagamento",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  rescheduled: "Reagendado",
  no_show: "Faltou",
};

function BookingsPanel({
  bookings,
  onChanged,
}: {
  bookings: Awaited<ReturnType<typeof getAdminBookings>>;
  onChanged: () => void;
}) {
  const setStatus = async (id: string, status: "confirmed" | "cancelled") => {
    if (status === "cancelled" && !confirm("Cancelar este pedido?")) return;
    try {
      await updateBookingStatus({ data: { id, status } });
      toast.success(status === "confirmed" ? "Pagamento confirmado" : "Agendamento cancelado");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  };
  return (
    <Card className="p-6 shadow-card">
      <h2 className="mb-1 text-lg font-semibold text-foreground">Pedidos recebidos</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Pedido novo não bloqueia o horário. Depois de ver o comprovante, toque em Confirmar (isso já ocupa o horário).
      </p>
      {bookings.length === 0 ? (
        <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {(b.services as { name: string } | null)?.name ?? "Serviço"} — {b.client_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDisplayDate(b.booking_date)} às {b.start_time}
                  </p>
                  {b.attendee_name && <p className="text-xs text-muted-foreground">Quem vai fazer: {b.attendee_name}</p>}
                  {b.client_phone && (
                    <a className="text-xs text-primary underline" href={`https://wa.me/55${b.client_phone}`} target="_blank" rel="noreferrer">
                      WhatsApp {formatPhone(b.client_phone)}
                    </a>
                  )}
                  {b.amount_cents != null && <p className="text-xs text-muted-foreground">Pix: {formatCurrencyCents(b.amount_cents)}</p>}
                  {b.notes && <p className="text-xs text-muted-foreground">Obs.: {b.notes}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.proofUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={b.proofUrl} target="_blank" rel="noreferrer">Ver comprovante Pix</a>
                      </Button>
                    )}
                    {(b.status === "pending_payment" || b.status === "requested") && (
                      <>
                        <Button size="sm" onClick={() => setStatus(b.id, "confirmed")}>Confirmar</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "cancelled")}>Cancelar</Button>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`mt-2 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium sm:mt-0 ${
                    b.status === "confirmed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : b.status === "cancelled"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  {statusLabels[b.status] ?? b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ConfigPanel({
  config,
  onSaved,
}: {
  config: Record<string, string>;
  onSaved: () => void;
}) {
  const [notificationNumber, setNotificationNumber] = useState(config["notification_whatsapp_number"] ?? "");
  const [advanceDays, setAdvanceDays] = useState(config["advance_booking_days"] ?? "7");
  const [policy, setPolicy] = useState(config["cancellation_policy_text"] ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAppConfig({
        data: {
          notification_whatsapp_number: notificationNumber.replace(/\D/g, ""),
          advance_booking_days: advanceDays,
          cancellation_policy_text: policy,
        },
      });
      toast.success("Configurações salvas.");
      onSaved();
    } catch (err) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 shadow-card">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Configurações do sistema</h2>
      <form onSubmit={save} className="space-y-4">
        <div>
          <Label htmlFor="notificationNumber">WhatsApp da profissional (somente números, com DDD)</Label>
          <Input
            id="notificationNumber"
            value={notificationNumber}
            onChange={(e) => setNotificationNumber(e.target.value)}
            placeholder="5511999999999"
          />
        </div>
        <div>
          <Label htmlFor="advanceDays">Antecedência mínima para agendar (dias)</Label>
          <Input
            id="advanceDays"
            type="number"
            value={advanceDays}
            onChange={(e) => setAdvanceDays(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="policy">Texto da política de cancelamento/reagendamento</Label>
          <Textarea
            id="policy"
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            rows={4}
          />
        </div>
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? "Salvando…" : "Salvar configurações"}
        </Button>
      </form>
    </Card>
  );
}
