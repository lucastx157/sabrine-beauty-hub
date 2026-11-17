import { useEffect, useState } from "react";
import { CheckCircle2, Download, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/lib/leads.functions";

const GUIDE_URL = "/guia-micropigmentacao-sobrancelha.pdf";

export const LEAD_INTERESTS = [
  "Micropigmentação de sobrancelha",
  "Micropigmentação labial",
  "Extensão de cílios (em breve)",
  "Design de sobrancelha",
  "Outro",
];

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function trafficSource() {
  if (typeof window === "undefined") return "site";
  const p = new URLSearchParams(window.location.search);
  const parts = ["utm_source", "utm_medium", "utm_campaign", "utm_content"]
    .map((k) => p.get(k))
    .filter(Boolean);
  return parts.length ? parts.join(" / ") : "site";
}

export function LeadForm({
  interest,
  onInterestChange,
}: {
  interest: string;
  onInterestChange: (v: string) => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [source, setSource] = useState("site");

  useEffect(() => setSource(trafficSource()), []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      toast.error("Informe seu WhatsApp com DDD.");
      return;
    }
    setSending(true);
    try {
      await submitLead({ data: { name, whatsapp, city, interest, message, source, website } });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar. Tente de novo.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-primary/30 bg-secondary p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <h3 className="font-serif text-2xl font-semibold text-foreground">Recebemos seu contato</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Obrigada, {name.split(" ")[0]}. A Sabrine vai chamar você no WhatsApp para conversar com
          calma e tirar todas as suas dúvidas.
        </p>
        <Button asChild className="mt-2 h-11 rounded-md">
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" download>
            <Download className="mr-2 h-4 w-4" /> Baixar o guia gratuito
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-md border border-border/60 bg-card p-6 md:p-8"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-name">Seu nome</Label>
          <Input
            id="lead-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-whatsapp">WhatsApp com DDD</Label>
          <Input
            id="lead-whatsapp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(37) 90000-0000"
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-city">Sua cidade</Label>
          <Input
            id="lead-city"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={60}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-interest">Procedimento de interesse</Label>
          <select
            id="lead-interest"
            value={interest}
            onChange={(e) => onInterestChange(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {LEAD_INTERESTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lead-message">Sua dúvida ou recado (opcional)</Label>
        <Textarea
          id="lead-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
        />
      </div>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <Button type="submit" disabled={sending} className="h-11 rounded-md">
        {sending ? "Enviando…" : "Quero que a Sabrine me chame"} <Send className="ml-2 h-4 w-4" />
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Seus dados são usados apenas para a Sabrine entrar em contato com você.
      </p>
    </form>
  );
}
