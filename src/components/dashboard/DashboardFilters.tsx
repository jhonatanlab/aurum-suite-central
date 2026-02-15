import { useState, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Filter, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface DashboardFilters {
  source: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  productId: string | null;
  sellerId: string | null;
}

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "referral", label: "Indicação" },
  { value: "other", label: "Outro" },
];

const getDefaultFilters = (): DashboardFilters => ({
  source: null,
  dateFrom: startOfMonth(new Date()),
  dateTo: new Date(),
  productId: null,
  sellerId: null,
});

interface Props {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export function DashboardFilterBar({ filters, onChange }: Props) {
  const { company } = useCompany();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    supabase
      .from("products")
      .select("id, name")
      .eq("company_id", company.id)
      .eq("status", "active")
      .order("name")
      .limit(100)
      .then(({ data }) => setProducts(data ?? []));

    supabase
      .from("company_users")
      .select("user_id, role")
      .eq("company_id", company.id)
      .then(async ({ data }) => {
        if (!data?.length) return;
        // Fetch names via list-team-members
        const { data: result } = await supabase.functions.invoke(
          "list-team-members?company_id=" + company.id
        );
        if (result?.members) {
          setSellers(
            result.members.map((m: any) => ({
              id: m.user_id,
              name: m.name || m.email || m.user_id.slice(0, 8),
            }))
          );
        }
      });
  }, [company?.id]);

  const defaults = getDefaultFilters();
  const hasNonDefaultDates =
    filters.dateFrom?.getTime() !== defaults.dateFrom?.getTime() ||
    filters.dateTo?.getTime() !== defaults.dateTo?.getTime();

  const activeCount = [
    filters.source,
    filters.productId,
    filters.sellerId,
    hasNonDefaultDates ? true : null,
  ].filter(Boolean).length;

  const clearAll = () => onChange(getDefaultFilters());

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex flex-wrap gap-3 items-center p-4 bg-card/50 border border-border/30 rounded-xl">
        {/* Label */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
          {activeCount > 0 && (
            <Badge variant="default" className="ml-0.5 h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border/50 hidden sm:block" />

        {/* Source */}
        <Select
          value={filters.source ?? "all"}
          onValueChange={(v) => onChange({ ...filters, source: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[140px] h-9 text-xs bg-card border-border/50 rounded-lg">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            <SelectItem value="all">Todas origens</SelectItem>
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs rounded-lg bg-card border-border/50 px-3",
                !filters.dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom ?? undefined}
              onSelect={(d) => onChange({ ...filters, dateFrom: d ?? null })}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs rounded-lg bg-card border-border/50 px-3",
                !filters.dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo ?? undefined}
              onSelect={(d) => onChange({ ...filters, dateTo: d ?? null })}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Product */}
        <Select
          value={filters.productId ?? "all"}
          onValueChange={(v) => onChange({ ...filters, productId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs bg-card border-border/50 rounded-lg">
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50 max-h-60">
            <SelectItem value="all">Todos produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="truncate">{p.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Seller */}
        {sellers.length > 0 && (
          <Select
            value={filters.sellerId ?? "all"}
            onValueChange={(v) => onChange({ ...filters, sellerId: v === "all" ? null : v })}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs bg-card border-border/50 rounded-lg">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50 max-h-60">
              <SelectItem value="all">Todos vendedores</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear - pushed to the right */}
        {activeCount > 0 && (
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-2 h-9 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
