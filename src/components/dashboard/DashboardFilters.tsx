import { useState, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, SlidersHorizontal } from "lucide-react";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const periodLabel =
    filters.dateFrom && filters.dateTo
      ? `${format(filters.dateFrom, "dd/MM")} – ${format(filters.dateTo, "dd/MM")}`
      : "Selecionar período";

  // ---- Shared control renderers ----
  const SourceSelect = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <Select
      value={filters.source ?? "all"}
      onValueChange={(v) => onChange({ ...filters, source: v === "all" ? null : v })}
    >
      <SelectTrigger className={cn("h-9 text-xs bg-card border-border/50 rounded-lg", fullWidth ? "w-full" : "w-[140px]")}>
        <SelectValue placeholder="Origem" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-50">
        <SelectItem value="all">Todas origens</SelectItem>
        {SOURCE_OPTIONS.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const DateFromBtn = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 text-xs rounded-lg bg-card border-border/50 px-3 justify-start",
            fullWidth ? "w-full" : "",
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
  );

  const DateToBtn = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 text-xs rounded-lg bg-card border-border/50 px-3 justify-start",
            fullWidth ? "w-full" : "",
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
  );

  const ProductSelect = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <Select
      value={filters.productId ?? "all"}
      onValueChange={(v) => onChange({ ...filters, productId: v === "all" ? null : v })}
    >
      <SelectTrigger className={cn("h-9 text-xs bg-card border-border/50 rounded-lg", fullWidth ? "w-full" : "w-[160px]")}>
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
  );

  const SellerSelect = ({ fullWidth = false }: { fullWidth?: boolean }) =>
    sellers.length > 0 ? (
      <Select
        value={filters.sellerId ?? "all"}
        onValueChange={(v) => onChange({ ...filters, sellerId: v === "all" ? null : v })}
      >
        <SelectTrigger className={cn("h-9 text-xs bg-card border-border/50 rounded-lg", fullWidth ? "w-full" : "w-[150px]")}>
          <SelectValue placeholder="Vendedor" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50 max-h-60">
          <SelectItem value="all">Todos vendedores</SelectItem>
          {sellers.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  // ---- Mobile: compact trigger + Sheet ----
  if (isMobile) {
    return (
      <div className="mb-4 animate-fade-in">
        <div className="flex items-center gap-2 p-2.5 bg-card/50 border border-border/30 rounded-lg">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-card border-border/50 rounded-lg text-xs"
              >
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filtros
                {activeCount > 0 && (
                  <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                    {activeCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-left">Filtros do Dashboard</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3 py-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Origem</label>
                  <SourceSelect fullWidth />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">De</label>
                    <DateFromBtn fullWidth />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Até</label>
                    <DateToBtn fullWidth />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Produto</label>
                  <ProductSelect fullWidth />
                </div>
                {sellers.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Vendedor</label>
                    <SellerSelect fullWidth />
                  </div>
                )}
              </div>
              <SheetFooter className="flex-row gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={clearAll}
                  className="flex-1 gap-2"
                  disabled={activeCount === 0}
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
                <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                  Aplicar
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{periodLabel}</span>
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- Desktop: original horizontal bar ----
  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex flex-wrap gap-3 items-center p-4 bg-card/50 border border-border/30 rounded-xl">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
          {activeCount > 0 && (
            <Badge variant="default" className="ml-0.5 h-5 px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </div>

        <div className="h-6 w-px bg-border/50 hidden sm:block" />

        <SourceSelect />
        <DateFromBtn />
        <DateToBtn />
        <ProductSelect />
        <SellerSelect />

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
