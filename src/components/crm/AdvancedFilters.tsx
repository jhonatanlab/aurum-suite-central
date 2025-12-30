import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Trash2,
  CalendarIcon,
  Search,
  SortAsc,
  SortDesc,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTags } from "@/hooks/useTags";
import type { CrmFilters, FilterPreset, ValueCondition, SortField, SortDirection } from "@/hooks/useCrmFilters";

interface Stage {
  id: string;
  name: string;
  position: number;
}

interface AdvancedFiltersProps {
  filters: CrmFilters;
  updateFilter: <K extends keyof CrmFilters>(key: K, value: CrmFilters[K]) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  presets: FilterPreset[];
  savePreset: (name: string) => FilterPreset;
  loadPreset: (preset: FilterPreset) => void;
  deletePreset: (presetId: string) => void;
  setDateShortcut: (shortcut: string) => void;
  stages: Stage[];
  sources: { id: string; label: string }[];
  leadsCount: number;
  isFiltering?: boolean;
}

const dateShortcuts = [
  { id: "today", label: "Hoje" },
  { id: "7days", label: "Últimos 7 dias" },
  { id: "30days", label: "Últimos 30 dias" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
];

const sortOptions: { field: SortField; label: string }[] = [
  { field: "date", label: "Data" },
  { field: "value", label: "Valor" },
  { field: "name", label: "Nome" },
];

export function AdvancedFilters({
  filters,
  updateFilter,
  clearFilters,
  hasActiveFilters,
  presets,
  savePreset,
  loadPreset,
  deletePreset,
  setDateShortcut,
  stages,
  sources,
  leadsCount,
  isFiltering = false,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const { activeTags, isLoadingActive } = useTags();

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName("");
      setSaveDialogOpen(false);
    }
  };

  const toggleArrayFilter = (
    key: "sources" | "statuses" | "tags" | "responsibles",
    value: string
  ) => {
    const current = filters[key];
    if (current.includes(value)) {
      updateFilter(key, current.filter((v) => v !== value));
    } else {
      updateFilter(key, [...current, value]);
    }
  };

  const activeFiltersCount = [
    filters.sources.length > 0,
    filters.statuses.length > 0,
    filters.tags.length > 0,
    filters.responsibles.length > 0,
    filters.valueCondition !== null,
    filters.dateStart !== null || filters.dateEnd !== null,
    filters.search !== "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Presets Bar */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros salvos:</span>
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center gap-1">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => loadPreset(preset)}
              >
                {preset.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deletePreset(preset.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main Filter Bar */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-wrap gap-3 items-center p-4 bg-card/50 border border-border/30 rounded-xl">
          {/* Toggle and Search */}
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/30 hover:bg-primary/10"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 px-1.5">
                  {activeFiltersCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Global Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar em nome, e-mail, telefone, observações..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-10 h-9 bg-card border-border/50 focus:border-primary"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Sort */}
            <div className="flex items-center gap-1">
              <Select
                value={filters.sortField}
                onValueChange={(v) => updateFilter("sortField", v as SortField)}
              >
                <SelectTrigger className="h-9 w-[100px] bg-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.field} value={opt.field}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() =>
                  updateFilter(
                    "sortDirection",
                    filters.sortDirection === "asc" ? "desc" : "asc"
                  )
                }
              >
                {filters.sortDirection === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              {isFiltering ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <span className="text-sm font-medium">
                  <span className="text-primary">{leadsCount}</span>{" "}
                  <span className="text-muted-foreground">leads encontrados</span>
                </span>
              )}
            </div>

            {/* Save Preset */}
            {hasActiveFilters && (
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Salvar Filtro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Nome do filtro</Label>
                      <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Ex: Leads quentes do Instagram"
                        onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSaveDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2 h-9 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        <CollapsibleContent>
          <div className="mt-3 p-4 bg-card/30 border border-border/30 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sources */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Origem</Label>
                <ScrollArea className="h-[120px] border border-border/30 rounded-lg p-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-2 py-1.5 px-1 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => toggleArrayFilter("sources", source.id)}
                    >
                      <Checkbox
                        checked={filters.sources.includes(source.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm">{source.label}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Status/Stage */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status/Coluna</Label>
                <ScrollArea className="h-[120px] border border-border/30 rounded-lg p-2">
                  {stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-2 py-1.5 px-1 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => toggleArrayFilter("statuses", stage.id)}
                    >
                      <Checkbox
                        checked={filters.statuses.includes(stage.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm">{stage.name}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <ScrollArea className="h-[120px] border border-border/30 rounded-lg p-2">
                  {isLoadingActive ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : activeTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">
                      Nenhuma tag cadastrada
                    </p>
                  ) : (
                    activeTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 py-1.5 px-1 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => toggleArrayFilter("tags", tag.id)}
                      >
                        <Checkbox
                          checked={filters.tags.includes(tag.id)}
                          className="pointer-events-none"
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>

              {/* Value Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Valor</Label>
                <div className="space-y-2 border border-border/30 rounded-lg p-2">
                  <Select
                    value={filters.valueCondition || "none"}
                    onValueChange={(v) =>
                      updateFilter(
                        "valueCondition",
                        v === "none" ? null : (v as ValueCondition)
                      )
                    }
                  >
                    <SelectTrigger className="h-8 bg-card">
                      <SelectValue placeholder="Condição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="greater">Maior que</SelectItem>
                      <SelectItem value="less">Menor que</SelectItem>
                      <SelectItem value="between">Entre</SelectItem>
                    </SelectContent>
                  </Select>
                  {filters.valueCondition && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={filters.valueCondition === "between" ? "Mín" : "Valor"}
                        value={filters.valueMin ?? ""}
                        onChange={(e) =>
                          updateFilter(
                            "valueMin",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        className="h-8"
                      />
                      {filters.valueCondition === "between" && (
                        <Input
                          type="number"
                          placeholder="Máx"
                          value={filters.valueMax ?? ""}
                          onChange={(e) =>
                            updateFilter(
                              "valueMax",
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          className="h-8"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <div className="flex flex-wrap gap-2 items-center">
                {/* Shortcuts */}
                <div className="flex flex-wrap gap-1">
                  {dateShortcuts.map((shortcut) => (
                    <Button
                      key={shortcut.id}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setDateShortcut(shortcut.id)}
                    >
                      {shortcut.label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Date Start */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-8 w-[130px] justify-start text-left font-normal text-xs",
                          !filters.dateStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateStart
                          ? format(filters.dateStart, "dd/MM/yyyy", { locale: ptBR })
                          : "Data início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateStart || undefined}
                        onSelect={(date) => updateFilter("dateStart", date || null)}
                        initialFocus
                        className="pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-muted-foreground">até</span>

                  {/* Date End */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-8 w-[130px] justify-start text-left font-normal text-xs",
                          !filters.dateEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateEnd
                          ? format(filters.dateEnd, "dd/MM/yyyy", { locale: ptBR })
                          : "Data fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateEnd || undefined}
                        onSelect={(date) => updateFilter("dateEnd", date || null)}
                        initialFocus
                        className="pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>

                  {(filters.dateStart || filters.dateEnd) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        updateFilter("dateStart", null);
                        updateFilter("dateEnd", null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
