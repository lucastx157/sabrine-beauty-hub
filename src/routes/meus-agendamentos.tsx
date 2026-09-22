import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, Clock, Phone, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyBookings, cancelBooking, rescheduleBooking } from "@/lib/booking.functions";
import { getAvailableSlots } from "@/lib/booking.functions";
import { formatDisplayDate, formatPhone } from "@/lib/dates";
import { toast } from "sonner";

export const Route = createFileRoute("/meus-agendamentos")({
  head: () => ({
    meta: [
      { title: "Meus Agendamentos | Sabrine Beauty Flow" },
      {
        name: "description",
        content: "Consulte, cancele ou reagende seus agendamentos no Sabrine Beauty Flow.",
      },
      { property: "og:title", content: "Meus Agendamentos | Sabrine Beauty Flow" },
      { property: "og:description", content: "Consulte, cancele ou reagende seus agendamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyBookingsPage,
});

function MyBookingsPage() {
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getMyBookings>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<NonNullable<typeof bookings>[number] | null>(null);
  const [action, setAction] = useState<"cancel" | "reschedule" | null>(null);

  const fetchBookings = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Digite um telefone válido com DDD.");
      return;
    }
    setLoading(true);
    try {
      const data = await getMyBookings({ data: { phone } });
      setBookings(data);
    } catch (err) {
      toast.error("Não foi possível carregar seus agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    try {
      await cancelBooking({ data: { bookingId: selectedBooking.id, phone } });
      toast.success("Agendamento cancelado.");
      setAction(null);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar.");
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" className="mb-6 -ml-4">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>

        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Meus agendamentos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Informe seu telefone para consultar, cancelar ou reagendar.
        </p>

        <div className="mt-8 flex gap-3">
          <div className="flex-1">
            <Label htmlFor="phone" className="sr-only">
              Telefone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="rounded-full"
            />
          </div>
          <Button onClick={fetchBookings} disabled={loading} className="rounded-full px-6">
            {loading ? "Carregando…" : "Consultar"}
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          {bookings?.length === 0 && (
            <p className="text-center text-muted-foreground">Nenhum agendamento encontrado.</p>
          )}
          {bookings?.map((b) => (
            <Card key={b.id} className="p-5 shadow-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{b.serviceName}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDisplayDate(b.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> {b.time}
                    </span>
                  </div>
                </div>
                {b.canCancel && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setSelectedBooking(b);
                        setAction("reschedule");
                      }}
                    >
                      Reagendar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setSelectedBooking(b);
                        setAction("cancel");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                {!b.canCancel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" /> Alteração indisponível
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "cancel" ? "Cancelar agendamento" : "Reagendar agendamento"}
            </DialogTitle>
            <DialogDescription>
              {action === "cancel"
                ? "Você só pode cancelar até 24 horas antes do horário marcado."
                : "Escolha uma nova data e horário disponíveis."}
            </DialogDescription>
          </DialogHeader>
          {action === "cancel" ? (
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAction(null)} className="rounded-full">
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleCancel} className="rounded-full">
                Confirmar cancelamento
              </Button>
            </div>
          ) : (
            <RescheduleForm
              booking={selectedBooking!}
              phone={phone}
              onDone={() => {
                setAction(null);
                setSelectedBooking(null);
                fetchBookings();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RescheduleForm({
  booking,
  phone,
  onDone,
}: {
  booking: NonNullable<Awaited<ReturnType<typeof getMyBookings>>>[number];
  phone: string;
  onDone: () => void;
}) {
  const [date, setDate] = useState(booking.date);
  const [slots, setSlots] = useState<{ date: string; time: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSlots = async (newDate: string) => {
    setDate(newDate);
    setSelectedTime("");
    setLoadingSlots(true);
    try {
      const data = await getAvailableSlots({
        data: { from: newDate, to: newDate },
      });
      setSlots(data);
    } catch {
      toast.error("Erro ao buscar horários.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const submit = async () => {
    if (!selectedTime) return;
    setSaving(true);
    try {
      await rescheduleBooking({
        data: { bookingId: booking.id, phone, newDate: date, newTime: selectedTime },
      });
      toast.success("Agendamento reagendado com sucesso.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reagendar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div>
        <Label htmlFor="newDate">Nova data</Label>
        <Input
          id="newDate"
          type="date"
          value={date}
          onChange={(e) => loadSlots(e.target.value)}
          className="rounded-xl"
        />
      </div>
      {loadingSlots ? (
        <p className="text-sm text-muted-foreground">Carregando horários…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <button
              key={s.time}
              type="button"
              onClick={() => setSelectedTime(s.time)}
              className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                selectedTime === s.time
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onDone} disabled={saving} className="rounded-full">
          Cancelar
        </Button>
        <Button onClick={submit} disabled={!selectedTime || saving} className="rounded-full">
          {saving ? "Salvando…" : "Confirmar reagendamento"}
        </Button>
      </div>
    </div>
  );
}
