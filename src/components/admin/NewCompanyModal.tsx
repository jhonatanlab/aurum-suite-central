import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Mail } from "lucide-react";

interface NewCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function NewCompanyModal({ open, onOpenChange, onCreated }: NewCompanyModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    owner_name: "",
    email: "",
    plan: "starter",
    status: "active",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () =>
    setForm({ name: "", cnpj: "", owner_name: "", email: "", plan: "starter", status: "active" });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.owner_name.trim() || !form.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome da empresa, o responsável e o e-mail.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-company", {
        body: {
          name: form.name.trim(),
          cnpj: form.cnpj.trim() || null,
          owner_name: form.owner_name.trim(),
          email: form.email.trim(),
          plan: form.plan,
          status: form.status,
          redirect_base: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Empresa criada",
        description:
          data?.email_action === "recovery"
            ? `Este e-mail já existia. Enviamos um link para redefinir a senha para ${form.email}.`
            : `Enviamos um convite para ${form.email} definir a senha de acesso.`,
      });

      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({
        title: "Erro ao criar empresa",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Nova Empresa
          </DialogTitle>
          <DialogDescription>
            A empresa é criada já vinculada ao responsável, que recebe um e-mail para definir a
            própria senha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da empresa *</Label>
            <Input
              id="company-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Aurum Joias"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-cnpj">CNPJ</Label>
            <Input
              id="company-cnpj"
              value={form.cnpj}
              onChange={(e) => set("cnpj", e.target.value)}
              placeholder="00.000.000/0001-00"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="owner-name">Responsável *</Label>
              <Input
                id="owner-name"
                value={form.owner_name}
                onChange={(e) => set("owner_name", e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-email">E-mail *</Label>
              <Input
                id="owner-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="responsavel@empresa.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status inicial</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            O link de definição de senha é enviado automaticamente para o e-mail informado.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
