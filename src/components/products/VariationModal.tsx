import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AttributeEntry {
  key: string;
  value: string;
}

interface ParentProduct {
  id: string;
  company_id: string;
  category: string | null;
  name: string;
}

interface VariationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentProduct: ParentProduct;
  variation?: any;
  onSaved: () => void;
}

const ATTR_SUGGESTIONS = [
  "Cor",
  "Tamanho",
  "Banho",
  "Comprimento",
  "Aro",
  "Peso",
  "Quilate",
  "Material",
  "Formato",
  "Fecho",
];

const inputCls =
  "bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20";

export function VariationModal({
  open,
  onOpenChange,
  parentProduct,
  variation,
  onSaved,
}: VariationModalProps) {
  const isEditing = !!variation;
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [attributes, setAttributes] = useState<AttributeEntry[]>([]);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (variation) {
      setName(variation.name || "");
      setSku(variation.sku || "");
      setBarcode(variation.barcode || "");
      setPrice(variation.price != null ? String(variation.price) : "");
      setPromoPrice(variation.promo_price != null ? String(variation.promo_price) : "");
      setCostPrice(variation.cost_price != null ? String(variation.cost_price) : "");
      setStock(variation.stock != null ? String(variation.stock) : "");
      setMinimumStock(variation.minimum_stock != null ? String(variation.minimum_stock) : "");
      const attrs = variation.variant_attributes || {};
      setAttributes(
        Object.entries(attrs).map(([k, v]) => ({ key: k, value: String(v ?? "") }))
      );
    } else {
      setName("");
      setSku("");
      setBarcode("");
      setPrice("");
      setPromoPrice("");
      setCostPrice("");
      setStock("");
      setMinimumStock("");
      setAttributes([]);
    }
    setCustomKey("");
    setCustomValue("");
    setShowCustom(false);
  }, [open, variation]);

  const addAttribute = (key: string) => {
    setAttributes((prev) => [...prev, { key, value: "" }]);
  };

  const updateAttribute = (index: number, value: string) => {
    setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, value } : a)));
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustom = () => {
    const k = customKey.trim();
    if (!k) return;
    setAttributes((prev) => [...prev, { key: k, value: customValue.trim() }]);
    setCustomKey("");
    setCustomValue("");
    setShowCustom(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const attrObj: Record<string, string> = {};
      for (const a of attributes) {
        if (a.value.trim() !== "") attrObj[a.key] = a.value.trim();
      }
      const numOrNull = (v: string) => (v === "" ? null : Number(v));
      const strOrNull = (v: string) => {
        const t = v.trim();
        return t === "" ? null : t;
      };

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update({
            name: name.trim(),
            sku: strOrNull(sku),
            barcode: strOrNull(barcode),
            price: Number(price),
            promo_price: numOrNull(promoPrice),
            cost_price: numOrNull(costPrice),
            stock: numOrNull(stock) ?? 0,
            minimum_stock: numOrNull(minimumStock) ?? 0,
            variant_attributes: attrObj,
          } as any)
          .eq("id", variation.id);
        if (error) throw error;
        toast.success("Variação atualizada");
      } else {
        const { error } = await supabase.from("products").insert({
          name: name.trim(),
          sku: strOrNull(sku),
          barcode: strOrNull(barcode),
          price: Number(price),
          promo_price: numOrNull(promoPrice),
          cost_price: numOrNull(costPrice),
          stock: numOrNull(stock) ?? 0,
          minimum_stock: numOrNull(minimumStock) ?? 0,
          variant_attributes: attrObj,
          type: "variation",
          parent_id: parentProduct.id,
          company_id: parentProduct.company_id,
          category: parentProduct.category,
          status: "active",
          pricing_mode: "manual",
        } as any);
        if (error) throw error;
        toast.success("Variação criada");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("unique") || msg.includes("duplicate")) {
        toast.error("SKU ou código de barras já cadastrado");
      } else {
        toast.error("Erro ao salvar variação: " + msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-[#1E1E1E] border-[#2A2A2A]">
        <DialogHeader className="border-b border-[#2A2A2A] pb-4">
          <DialogTitle className="text-xl font-semibold text-white">
            {isEditing ? "Editar Variação" : "Nova Variação"} — {parentProduct.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-white font-medium">Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ouro P"
                className={inputCls}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white font-medium">SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-2">
                <Label className="text-white font-medium">Código de barras</Label>
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white font-medium">Preço *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white font-medium">Preço promocional</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white font-medium">Preço de custo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white font-medium">Estoque</Label>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white font-medium">Estoque mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#2A2A2A]">
              <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
                Atributos
              </h3>
              <div className="flex flex-wrap gap-2">
                {ATTR_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addAttribute(s)}
                    className="px-2.5 py-1 text-xs rounded-md border border-[#2A2A2A] text-[#A1A1AA] hover:border-[#C7A052] hover:text-[#C7A052] transition"
                  >
                    + {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustom((v) => !v)}
                  className="px-2.5 py-1 text-xs rounded-md border border-[#C7A052]/40 text-[#C7A052] hover:bg-[#C7A052]/10 transition"
                >
                  + Customizado
                </button>
              </div>

              {showCustom && (
                <div className="flex gap-2 items-end p-3 rounded-lg bg-[#121212] border border-[#2A2A2A]">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-[#A1A1AA]">Chave</Label>
                    <Input
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="Ex: Acabamento"
                      className={inputCls + " h-8"}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-[#A1A1AA]">Valor</Label>
                    <Input
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      placeholder="Ex: Fosco"
                      className={inputCls + " h-8"}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addCustom}
                    className="bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] h-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {attributes.length === 0 ? (
                <p className="text-xs text-[#6B6B6B]">Nenhum atributo adicionado.</p>
              ) : (
                <div className="space-y-2">
                  {attributes.map((a, i) => (
                    <div
                      key={`${a.key}-${i}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#121212] border border-[#2A2A2A]"
                    >
                      <span className="text-xs text-[#C7A052] font-medium min-w-[80px]">
                        {a.key}
                      </span>
                      <Input
                        value={a.value}
                        onChange={(e) => updateAttribute(i, e.target.value)}
                        placeholder="Valor"
                        className={inputCls + " h-8 flex-1"}
                      />
                      <button
                        type="button"
                        onClick={() => removeAttribute(i)}
                        className="text-[#6B6B6B] hover:text-red-400 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#2A2A2A] flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2A2A2A] text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
