import { useState } from "react";
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
import { Reseller, useResellers } from "@/hooks/useResellers";
import { Loader2 } from "lucide-react";

interface ResellerEditFormProps {
  reseller?: Reseller | null;
  onSuccess: () => void;
}

export function ResellerEditForm({ reseller, onSuccess }: ResellerEditFormProps) {
  const { createReseller, updateReseller } = useResellers();
  const isEditing = !!reseller;

  const [formData, setFormData] = useState({
    name: reseller?.name || "",
    document: reseller?.document || "",
    phone: reseller?.phone || "",
    email: reseller?.email || "",
    commission_type: reseller?.commission_type || "percent",
    commission_value: reseller?.commission_value?.toString() || "10",
    status: reseller?.status || "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      document: formData.document || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      commission_type: formData.commission_type as "percent" | "fixed",
      commission_value: parseFloat(formData.commission_value) || 0,
      status: formData.status as "active" | "inactive",
    };

    if (isEditing && reseller) {
      await updateReseller.mutateAsync({ 
        id: reseller.id, 
        data,
        oldStatus: reseller.status,
      });
    } else {
      await createReseller.mutateAsync(data);
    }

    onSuccess();
  };

  const isPending = createReseller.isPending || updateReseller.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nome do revendedor"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="document">Documento (CPF/CNPJ)</Label>
          <Input
            id="document"
            value={formData.document}
            onChange={(e) =>
              setFormData({ ...formData, document: e.target.value })
            }
            placeholder="000.000.000-00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@exemplo.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Comissão</Label>
          <Select
            value={formData.commission_type}
            onValueChange={(value: "percent" | "fixed") =>
              setFormData({ ...formData, commission_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentual (%)</SelectItem>
              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="commission_value">Valor da Comissão</Label>
          <Input
            id="commission_value"
            type="number"
            min="0"
            step="0.01"
            value={formData.commission_value}
            onChange={(e) =>
              setFormData({ ...formData, commission_value: e.target.value })
            }
            placeholder="10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Salvar alterações" : "Criar revendedor"}
        </Button>
      </div>
    </form>
  );
}
