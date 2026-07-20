import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AttributeDef } from "./AttributeBuilder";

export interface VariationRow {
  key: string;
  combo: Record<string, string>;
  sku: string;
  barcode: string;
  price: string;
  cost_price: string;
  stock: string;
}

interface VariationMatrixProps {
  attributes: AttributeDef[];
  parentSku: string;
  rows: VariationRow[];
  onChange: (rows: VariationRow[]) => void;
}

function cartesian(attrs: AttributeDef[]): Record<string, string>[] {
  if (attrs.length === 0) return [];
  const valid = attrs.filter((a) => a.values.length > 0);
  if (valid.length === 0) return [];
  return valid.reduce<Record<string, string>[]>(
    (acc, attr) => {
      const next: Record<string, string>[] = [];
      for (const partial of acc) {
        for (const v of attr.values) {
          next.push({ ...partial, [attr.name]: v });
        }
      }
      return next;
    },
    [{}]
  );
}

function comboKey(combo: Record<string, string>): string {
  return Object.entries(combo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 6);
}

const inputCls =
  "bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20 h-8 text-sm";

export function VariationMatrix({ attributes, parentSku, rows, onChange }: VariationMatrixProps) {
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkCost, setBulkCost] = useState("");

  const combos = useMemo(() => cartesian(attributes), [attributes]);

  // Sync rows with cartesian combos (preserve existing values by key)
  useEffect(() => {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const next: VariationRow[] = combos.map((combo) => {
      const key = comboKey(combo);
      if (byKey.has(key)) return byKey.get(key)!;
      const suffix = Object.values(combo).map(slugify).filter(Boolean).join("-");
      const skuBase = parentSku ? slugify(parentSku) : "";
      return {
        key,
        combo,
        sku: skuBase ? `${skuBase}-${suffix}` : suffix,
        barcode: "",
        price: "",
        cost_price: "",
        stock: "0",
      };
    });
    const changed =
      next.length !== rows.length ||
      next.some((r, i) => rows[i]?.key !== r.key);
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combos, parentSku]);

  const updateRow = (idx: number, patch: Partial<VariationRow>) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const applyBulk = (field: "price" | "stock" | "cost_price", value: string) => {
    if (value === "") return;
    onChange(rows.map((r) => ({ ...r, [field]: value })));
  };

  if (combos.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-[#2A2A2A] text-center">
        <p className="text-sm text-[#6B6B6B]">
          Adicione atributos e valores para gerar a matriz de variações.
        </p>
      </div>
    );
  }

  const attrNames = attributes.filter((a) => a.values.length > 0).map((a) => a.name);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-[#121212] border border-[#2A2A2A] space-y-2">
        <Label className="text-white font-medium text-sm">Aplicar a todas ({combos.length})</Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Preço"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              className={inputCls}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => applyBulk("price", bulkPrice)}
              className="h-8 bg-[#C7A052]/20 hover:bg-[#C7A052]/30 text-[#C7A052] text-xs px-2"
            >
              OK
            </Button>
          </div>
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Custo"
              value={bulkCost}
              onChange={(e) => setBulkCost(e.target.value)}
              className={inputCls}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => applyBulk("cost_price", bulkCost)}
              className="h-8 bg-[#C7A052]/20 hover:bg-[#C7A052]/30 text-[#C7A052] text-xs px-2"
            >
              OK
            </Button>
          </div>
          <div className="flex gap-1">
            <Input
              type="number"
              min="0"
              placeholder="Estoque"
              value={bulkStock}
              onChange={(e) => setBulkStock(e.target.value)}
              className={inputCls}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => applyBulk("stock", bulkStock)}
              className="h-8 bg-[#C7A052]/20 hover:bg-[#C7A052]/30 text-[#C7A052] text-xs px-2"
            >
              OK
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#2A2A2A] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#121212]">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[#A1A1AA] uppercase">
                Variação
              </th>
              <th className="text-left px-2 py-2 text-xs font-medium text-[#A1A1AA] uppercase">
                SKU
              </th>
              <th className="text-left px-2 py-2 text-xs font-medium text-[#A1A1AA] uppercase">
                Preço
              </th>
              <th className="text-left px-2 py-2 text-xs font-medium text-[#A1A1AA] uppercase">
                Custo
              </th>
              <th className="text-left px-2 py-2 text-xs font-medium text-[#A1A1AA] uppercase">
                Estoque
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.key} className="border-t border-[#2A2A2A]">
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {attrNames.map((n) => (
                      <span
                        key={n}
                        className="px-1.5 py-0.5 text-xs rounded bg-[#C7A052]/15 text-white"
                      >
                        {row.combo[n]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={row.sku}
                    onChange={(e) => updateRow(idx, { sku: e.target.value })}
                    className={inputCls + " w-32"}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.price}
                    onChange={(e) => updateRow(idx, { price: e.target.value })}
                    className={inputCls + " w-24"}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.cost_price}
                    onChange={(e) => updateRow(idx, { cost_price: e.target.value })}
                    className={inputCls + " w-24"}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min="0"
                    value={row.stock}
                    onChange={(e) => updateRow(idx, { stock: e.target.value })}
                    className={inputCls + " w-20"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
