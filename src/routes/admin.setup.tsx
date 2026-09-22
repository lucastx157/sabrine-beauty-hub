import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/setup")({
  head: () => ({
    meta: [
      { title: "Configurar Administrador | Sabrine Beauty Flow" },
      { name: "description", content: "Criação do primeiro usuário administrador." },
    ],
  }),
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAdmin({ data: { email, password, setupToken: token } });
      setDone(true);
      toast.success("Administrador criado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar administrador.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md p-8 shadow-card">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link to="/">Voltar ao site</Link>
        </Button>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Criar administrador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use o token de setup configurado no ambiente do projeto.
        </p>
        {done ? (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
            Administrador criado. Agora você pode{" "}
            <Link to="/admin" className="underline">
              acessar o painel
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="token">Token de setup</Label>
              <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? "Criando…" : "Criar administrador"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
