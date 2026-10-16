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
  getAvailability,
  saveAvailability,
  deleteAvailability,
  getAdminBookings,
  getAppConfig,
  updateAppConfig,
  updateBookingStatus,
} from "@/lib/admin.functions";
import { formatDisplayDate } from "@/lib/dates";

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
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof getAvailability>>>([]);
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getAdminBookings>>>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        getAvailability({ data: undefined }),
        getAdminBookings({ data: undefined }),
        getAppConfig({ data: undefined }),
      ]);
      setAvailability(a);
      setBookings(b);
      setConfig(c);
    } catch (err) {
      toast.error("Erro ao carregar painel. Verifique se você tem permissão de admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-10 text-center">Carregando painel…</div>;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">Painel Sabrine Beauty</h1>
            <p className="text-sm text-muted-foreground">Gerencie disponibilidade, configurações e agendamentos.</p>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()} className="rounded-full">
            Sair
          </Button>
        </div>

        <Tabs defaultValue="availability" className="space-y-6">
          <TabsList className="rounded-full bg-secondary p-1">
            <TabsTrigger value="availability" className="rounded-full px-4">
              Disponibilidade
            </TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-full px-4">
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-full px-4">
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="availability">
            <AvailabilityPanel
              availability={availability}
              onChange={load}
            />
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

function AvailabilityPanel({
  availability,
  onChange,
}: {
  availability: Awaited<ReturnType<typeof getAvailability>>;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Partial<Awaited<ReturnType<typeof getAvailability>>[number] & { isNew?: boolean }> | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await saveAvailability({
        data: {
          id: editing.id,
          dayOfWeek: editing.day_of_week ?? 0,
          startTime: editing.start_time ?? "09:00",
          endTime: editing.end_time ?? "18:00",
          slotIntervalMinutes: editing.slot_interval_minutes ?? 30,
        },
      });
      toast.success("Disponibilidade salva.");
      setEditing(null);
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAvailability({ data: { id } });
      toast.success("Disponibilidade removida.");
      onChange();
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Horários de atendimento</h2>
        <Button
          onClick={() =>
            setEditing({
              isNew: true,
              day_of_week: 1,
              start_time: "09:00",
              end_time: "18:00",
              slot_interval_minutes: 30,
            })
          }
          size="sm"
          className="rounded-full"
        >
          + Adicionar
        </Button>
      </div>

      <div className="space-y-3">
        {availability
          .filter((a) => a.active)
          .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
          .map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
            >
              <div>
                <p className="font-medium text-foreground">{weekDays[a.day_of_week]}</p>
                <p className="text-sm text-muted-foreground">
                  {a.start_time} às {a.end_time} · intervalo de {a.slot_interval_minutes} min
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(a)}>
                  Editar
                </Button>
                <Button variant="destructive" size="sm" className="rounded-full" onClick={() => remove(a.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-border bg-secondary/30 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dia da semana</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={editing.day_of_week}
                onChange={(e) => setEditing({ ...editing, day_of_week: parseInt(e.target.value) })}
              >
                {weekDays.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Intervalo (min)</Label>
              <Input
                type="number"
                value={editing.slot_interval_minutes}
                onChange={(e) => setEditing({ ...editing, slot_interval_minutes: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Início</Label>
              <Input
                type="time"
                value={editing.start_time}
                onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Término</Label>
              <Input
                type="time"
                value={editing.end_time}
                onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditing(null)} className="rounded-full">
              Cancelar
            </Button>
            <Button type="submit" className="rounded-full">
              Salvar
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

const statusLabels: Record<string, string> = {
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
      <h2 className="mb-4 text-lg font-semibold text-foreground">Próximos agendamentos</h2>
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
                  {b.client_phone && <p className="text-xs text-muted-foreground">{b.client_phone}</p>}
                  {b.notes && <p className="text-xs text-muted-foreground">Obs.: {b.notes}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.proofUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={b.proofUrl} target="_blank" rel="noreferrer">Ver comprovante Pix</a>
                      </Button>
                    )}
                    {b.status === "pending_payment" && (
                      <>
                        <Button size="sm" onClick={() => setStatus(b.id, "confirmed")}>Confirmar pagamento</Button>
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
