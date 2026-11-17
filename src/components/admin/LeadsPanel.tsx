import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLeads, updateLead, type Lead, type LeadStatus } from "@/lib/leads.functions";

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Já chamei",
  agendou: "Agendou",
  sem_interesse: "Sem interesse",
};

const FILTERS: Array<{ value: "todos" | "retornar" | LeadStatus; label: string }> = [
  { value: "retornar", label: "Para chamar" },
  { value: "novo", label: "Novos" },
  { value: "contatado", label: "Já chamei" },
  { value: "agendou", label: "Agendaram" },
  { value: "todos", label: "Todos" },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function waLink(lead: Lead) {
  const digits = lead.whatsapp.replace(/\D/g, "");
  const full = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
  const first = lead.name.split(" ")[0];
  const text = `Olá, ${first}! Aqui é a Sabrine, da Sabrine Beauty. Vi que você deixou seu contato no site${
    lead.interest ? ` sobre ${lead.interest.replace(" (em breve)", "").toLowerCase()}` : ""
  }. Posso te ajudar?`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function formatPhoneBr(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function needsCall(lead: Lead, today: string) {
  if (lead.status === "novo") return true;
  return lead.status === "contatado" && !!lead.follow_up_on && lead.follow_up_on <= today;
}

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("retornar");

  const load = () =>
    getLeads({ data: undefined })
      .then(setLeads)
      .catch(() => toast.error("Erro ao carregar contatos."));

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  if (!leads) return <p className="p-6 text-center text-muted-foreground">Carregando…</p>;

  const today = todayIso();
  const visible = leads.filter((l) =>
    filter === "todos" ? true : filter === "retornar" ? needsCall(l, today) : l.status === filter,
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-card">
        <p className="text-sm text-muted-foreground">
          Clientes que deixaram nome e WhatsApp no site. Toque em{" "}
          <strong>Chamar no WhatsApp</strong>, depois marque a situação e, se precisar, escolha a
          data para chamar de novo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value === "retornar"
                ? ` (${leads.filter((l) => needsCall(l, today)).length})`
                : ""}
            </Button>
          ))}
        </div>
      </Card>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Nenhum contato nesta lista.</p>
      ) : (
        visible.map((lead) => <LeadCard key={lead.id} lead={lead} onSaved={load} />)
      )}
    </div>
  );
}

function LeadCard({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [followUp, setFollowUp] = useState(lead.follow_up_on ?? "");
  const [note, setNote] = useState(lead.admin_note ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (nextStatus = status) => {
    setSaving(true);
    try {
      await updateLead({
        data: {
          id: lead.id,
          created_at: lead.created_at,
          storage: lead.storage,
          status: nextStatus,
          follow_up_on: followUp || null,
          admin_note: note || null,
        },
      });
      toast.success("Contato atualizado.");
      onSaved();
    } catch {
      toast.error("Não consegui salvar.");
    } finally {
      setSaving(false);
    }
  };

  const created = new Date(lead.created_at);

  return (
    <Card className="space-y-3 p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">{lead.name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatPhoneBr(lead.whatsapp)}
            {lead.city ? ` · ${lead.city}` : ""}
          </p>
          {lead.interest && <p className="mt-1 text-sm text-foreground">{lead.interest}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Chegou em {created.toLocaleDateString("pt-BR")} às{" "}
            {created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {lead.source && lead.source !== "site" ? ` · origem: ${lead.source}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
          {STATUS_LABEL[lead.status]}
        </span>
      </div>

      {lead.message && (
        <p className="rounded-md bg-secondary p-3 text-sm text-foreground">“{lead.message}”</p>
      )}

      <Button asChild className="w-full rounded-md">
        <a
          href={waLink(lead)}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            if (status === "novo") {
              setStatus("contatado");
              void save("contatado");
            }
          }}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> Chamar no WhatsApp
        </a>
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`st-${lead.id}`}>Situação</Label>
          <select
            id={`st-${lead.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`fu-${lead.id}`}>Chamar de novo em</Label>
          <Input
            id={`fu-${lead.id}`}
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`nt-${lead.id}`}>Anotação</Label>
        <Textarea
          id={`nt-${lead.id}`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </div>
      <Button
        variant="outline"
        disabled={saving}
        onClick={() => void save()}
        className="w-full rounded-md"
      >
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </Card>
  );
}
