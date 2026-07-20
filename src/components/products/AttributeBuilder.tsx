import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AttributeDef {
  name: string;
  values: string[];
}

interface AttributeBuilderProps {
  attributes: AttributeDef[];
  onChange: (attrs: AttributeDef[]) => void;
}

const SUGGESTIONS = ["Cor", "Tamanho", "Banho", "Comprimento", "Aro", "Material", "Formato"];

const inputCls =
  "bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20 h-9";

export function AttributeBuilder({ attributes, onChange }: AttributeBuilderProps) {
  const [newAttrName, setNewAttrName] = useState("");
  const [valueInputs, setValueInputs] = useState<Record<number, string>>({});

  const addAttribute = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (attributes.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...attributes, { name: trimmed, values: [] }]);
    setNewAttrName("");
  };

  const removeAttribute = (idx: number) => {
    onChange(attributes.filter((_, i) => i !== idx));
  };

  const addValue = (idx: number) => {
    const v = (valueInputs[idx] || "").trim();
    if (!v) return;
    const current = attributes[idx];
    if (current.values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    const updated = [...attributes];
    updated[idx] = { ...current, values: [...current.values, v] };
    onChange(updated);
    setValueInputs({ ...valueInputs, [idx]: "" });
  };

  const removeValue = (attrIdx: number, valueIdx: number) => {
    const updated = [...attributes];
    updated[attrIdx] = {
      ...updated[attrIdx],
      values: updated[attrIdx].values.filter((_, i) => i !== valueIdx),
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white font-medium">Adicionar atributo</Label>
        <div className="flex gap-2">
          <Input
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAttribute(newAttrName);
              }
            }}
            placeholder="Ex: Cor, Tamanho, Banho..."
            className={inputCls}
          />
          <Button
            type="button"
            onClick={() => addAttribute(newAttrName)}
            className="bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold h-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTIONS.filter(
            (s) => !attributes.some((a) => a.name.toLowerCase() === s.toLowerCase())
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addAttribute(s)}
              className="px-2 py-0.5 text-xs rounded-md border border-[#2A2A2A] text-[#A1A1AA] hover:border-[#C7A052] hover:text-[#C7A052] transition"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {attributes.length === 0 && (
        <div className="p-4 rounded-lg border border-dashed border-[#2A2A2A] text-center">
          <p className="text-sm text-[#6B6B6B]">
            Adicione pelo menos um atributo (ex: Cor, Tamanho) para gerar as variações.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {attributes.map((attr, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-[#121212] border border-[#2A2A2A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#C7A052]">{attr.name}</span>
              <button
                type="button"
                onClick={() => removeAttribute(idx)}
                className="text-[#6B6B6B] hover:text-red-400 p-1"
                title="Remover atributo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {attr.values.map((v, vi) => (
                <span
                  key={vi}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#C7A052]/15 border border-[#C7A052]/30 text-xs text-white"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => removeValue(idx, vi)}
                    className="text-[#C7A052] hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {attr.values.length === 0 && (
                <span className="text-xs text-[#6B6B6B] py-1">Nenhum valor.</span>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={valueInputs[idx] || ""}
                onChange={(e) => setValueInputs({ ...valueInputs, [idx]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addValue(idx);
                  }
                }}
                placeholder={`Valor de ${attr.name} (Enter para adicionar)`}
                className={inputCls + " text-sm"}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => addValue(idx)}
                variant="outline"
                className="border-[#2A2A2A] text-[#C7A052] hover:bg-[#C7A052]/10 hover:text-[#C7A052] h-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
