import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CheckoutFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planKey: string;
  planName: string;
  planPrice: string;
  companyId: string | null;
}

export default function CheckoutFormModal({
  open,
  onOpenChange,
  planKey,
  planName,
  planPrice,
  companyId,
}: CheckoutFormModalProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = "E-mail inválido";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10)
      e.phone = "Telefone inválido";
    if (!form.company.trim()) e.company = "Nome da empresa é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // 1. Insert lead into leads_checkout
      const { data: lead, error: leadError } = await supabase
        .from("leads_checkout" as any)
        .insert({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company_name: form.company.trim(),
          plan: planKey,
        } as any)
        .select("id")
        .single();

      if (leadError) throw new Error("Erro ao salvar dados: " + leadError.message);

      // 2. Create checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          plan: planKey,
          email: form.email.trim(),
          company_id: companyId,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_company: form.company.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error === "ALREADY_SUBSCRIBED") {
          toast.error(data.message || "Você já possui uma assinatura ativa.");
        } else {
          toast.error(data.message || data.error);
        }
        return;
      }

      // 3. Update lead with session_id
      if (data?.session_id && (lead as any)?.id) {
        await supabase
          .from("leads_checkout" as any)
          .update({ session_id: data.session_id, status: "checkout_started" } as any)
          .eq("id", (lead as any).id);
      }

      // 4. Redirect
      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">
            Assinar {planName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {planPrice}/mês — Preencha seus dados para continuar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name" className="text-foreground/80">Nome completo</Label>
            <Input
              id="checkout-name"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="bg-secondary border-border"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-email" className="text-foreground/80">E-mail</Label>
            <Input
              id="checkout-email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="bg-secondary border-border"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone" className="text-foreground/80">Telefone</Label>
            <Input
              id="checkout-phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="bg-secondary border-border"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-company" className="text-foreground/80">Nome da empresa</Label>
            <Input
              id="checkout-company"
              placeholder="Sua empresa"
              value={form.company}
              onChange={(e) => updateField("company", e.target.value)}
              className="bg-secondary border-border"
            />
            {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
          </div>

          <Button
            className="w-full mt-2"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Ir para pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
