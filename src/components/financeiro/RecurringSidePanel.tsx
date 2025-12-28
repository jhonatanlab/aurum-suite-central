import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface RecurringTransaction {
  id: string;
  name: string;
  value: number;
  type: string;
  category_id: string | null;
  payment_method_default: string | null;
  recurrence_type: string;
  custom_interval_days: number | null;
  start_date: string;
  is_limited: boolean;
  installments_total: number | null;
  installments_remaining: number | null;
  status: string;
  next_execution: string;
}

interface RecurringSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: RecurringTransaction | null;
}

export function RecurringSidePanel({ open, onOpenChange, editingItem }: RecurringSidePanelProps) {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<"entrada" | "saida">("saida");
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("monthly");
  const [customDays, setCustomDays] = useState("");
  const [isLimited, setIsLimited] = useState(false);
  const [installmentsTotal, setInstallmentsTotal] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["financial_categories", company?.id, type],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("company_id", company.id)
        .eq("type", type);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && open,
  });

  // Reset form when opening/closing or when editingItem changes
  useEffect(() => {
    if (open && editingItem) {
      setName(editingItem.name);
      setValue(String(editingItem.value));
      setType(editingItem.type as "entrada" | "saida");
      setCategoryId(editingItem.category_id || "");
      setPaymentMethod(editingItem.payment_method_default || "");
      setRecurrenceType(editingItem.recurrence_type);
      setCustomDays(editingItem.custom_interval_days ? String(editingItem.custom_interval_days) : "");
      setIsLimited(editingItem.is_limited);
      setInstallmentsTotal(editingItem.installments_total ? String(editingItem.installments_total) : "");
      setStartDate(editingItem.start_date);
    } else if (open) {
      setName("");
      setValue("");
      setType("saida");
      setCategoryId("");
      setPaymentMethod("");
      setRecurrenceType("monthly");
      setCustomDays("");
      setIsLimited(false);
      setInstallmentsTotal("");
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, editingItem]);

  const handleSubmit = async () => {
    if (!company?.id) {
      toast.error("Empresa não encontrada");
      return;
    }

    if (!name.trim() || !value || !startDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (recurrenceType === "custom" && !customDays) {
      toast.error("Informe o intervalo em dias para recorrência personalizada");
      return;
    }

    if (isLimited && !installmentsTotal) {
      toast.error("Informe o número total de parcelas");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        company_id: company.id,
        name: name.trim(),
        value: parseFloat(value),
        type,
        category_id: categoryId || null,
        payment_method_default: paymentMethod || null,
        recurrence_type: recurrenceType,
        custom_interval_days: recurrenceType === "custom" ? parseInt(customDays) : null,
        start_date: startDate,
        is_limited: isLimited,
        installments_total: isLimited ? parseInt(installmentsTotal) : null,
        installments_remaining: isLimited ? parseInt(installmentsTotal) : null,
        status: "active",
        next_execution: startDate,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("recurring_transactions")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Recorrência atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("recurring_transactions")
          .insert(payload);
        if (error) throw error;
        toast.success("Recorrência criada com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving recurrence:", error);
      toast.error("Erro ao salvar recorrência");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {editingItem ? "Editar Recorrência" : "Nova Recorrência"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aluguel, Internet, etc."
              className="bg-background border-border"
            />
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="bg-background border-border"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as "entrada" | "saida")}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Método de Pagamento Padrão</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label>Periodicidade *</Label>
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Days */}
          {recurrenceType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customDays">Intervalo em dias *</Label>
              <Input
                id="customDays"
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Ex: 15"
                className="bg-background border-border"
              />
            </div>
          )}

          {/* Is Limited */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
            <div>
              <Label htmlFor="isLimited">Número limitado de parcelas?</Label>
              <p className="text-sm text-muted-foreground">
                Se desativado, a recorrência será infinita
              </p>
            </div>
            <Switch
              id="isLimited"
              checked={isLimited}
              onCheckedChange={setIsLimited}
            />
          </div>

          {/* Installments Total */}
          {isLimited && (
            <div className="space-y-2">
              <Label htmlFor="installments">Total de Parcelas *</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                value={installmentsTotal}
                onChange={(e) => setInstallmentsTotal(e.target.value)}
                placeholder="Ex: 12"
                className="bg-background border-border"
              />
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Data Inicial *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
