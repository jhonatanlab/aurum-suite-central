import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { VariationModal } from "./VariationModal";

interface ParentProduct {
  id: string;
  company_id: string;
  category: string | null;
  name: string;
}

interface VariationsSectionProps {
  parentProduct: ParentProduct;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function VariationsSection({ parentProduct }: VariationsSectionProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: variations = [], isLoading } = useQuery({
    queryKey: ["variations", parentProduct.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, sku, barcode, price, promo_price, cost_price, stock, minimum_stock, variant_attributes, status"
        )
        .eq("parent_id", parentProduct.id)
        .eq("type", "variation")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const visible = variations.filter((v) => showInactive || v.status !== "inactive");

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (v: any) => {
    setEditing(v);
    setModalOpen(true);
  };

  const deactivate = async (v: any) => {
    if (!window.confirm("Desativar esta variação?")) return;
    const { error } = await supabase
      .from("products")
      .update({ status: "inactive" } as any)
      .eq("id", v.id);
    if (error) {
      toast.error("Erro ao desativar: " + error.message);
      return;
    }
    toast.success("Variação desativada");
    queryClient.invalidateQueries({ queryKey: ["variations", parentProduct.id] });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#C7A052] uppercase tracking-wider">
          Variações
        </h3>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold h-8"
        >
          <Plus className="h-3 w-3 mr-1" /> Adicionar variação
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="accent-[#C7A052]"
        />
        Mostrar desativadas
      </label>

      {isLoading ? (
        <p className="text-xs text-[#6B6B6B]">Carregando...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[#6B6B6B] text-center py-6 border border-dashed border-[#2A2A2A] rounded-lg">
          Nenhuma variação criada. Adicione a primeira.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((v) => {
            const attrs = (v.variant_attributes || {}) as Record<string, any>;
            const isInactive = v.status === "inactive";
            return (
              <div
                key={v.id}
                className="bg-[#121212] border border-[#2A2A2A] rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{v.name}</span>
                    {v.sku && <span className="text-xs text-[#A1A1AA]">SKU: {v.sku}</span>}
                    {isInactive && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#2A2A2A] text-[#A1A1AA] border border-[#3A3A3A]">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(v)}
                      className="h-7 border-[#2A2A2A] text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2A]"
                    >
                      Editar
                    </Button>
                    {!isInactive && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => deactivate(v)}
                        className="h-7 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                      >
                        Desativar
                      </Button>
                    )}
                  </div>
                </div>

                {Object.keys(attrs).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(attrs).map(([k, val]) => (
                      <span
                        key={k}
                        className="bg-[#C7A052]/10 text-[#C7A052] border border-[#C7A052]/30 rounded px-2 py-0.5 text-xs"
                      >
                        {k}: {String(val)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-[#A1A1AA]">
                  <span>
                    Preço: <span className="text-white font-medium">{brl(Number(v.price) || 0)}</span>
                  </span>
                  {v.promo_price != null && Number(v.promo_price) > 0 && (
                    <span>
                      Promo:{" "}
                      <span className="text-[#C7A052] font-medium">
                        {brl(Number(v.promo_price))}
                      </span>
                    </span>
                  )}
                  <span>
                    Estoque: <span className="text-white font-medium">{v.stock ?? 0}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VariationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        parentProduct={parentProduct}
        variation={editing || undefined}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["variations", parentProduct.id] })
        }
      />
    </div>
  );
}
