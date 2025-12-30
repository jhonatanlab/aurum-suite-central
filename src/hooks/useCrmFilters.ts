import { useState, useMemo, useCallback } from "react";
import { 
  parseISO, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths 
} from "date-fns";

export interface FilterPreset {
  id: string;
  name: string;
  filters: CrmFilters;
}

export type ValueCondition = "greater" | "less" | "between";
export type SortField = "date" | "value" | "name";
export type SortDirection = "asc" | "desc";

export interface CrmFilters {
  search: string;
  sources: string[];
  statuses: string[];
  tags: string[];
  responsibles: string[];
  valueCondition: ValueCondition | null;
  valueMin: number | null;
  valueMax: number | null;
  dateStart: Date | null;
  dateEnd: Date | null;
  sortField: SortField;
  sortDirection: SortDirection;
}

export interface Lead {
  id: string;
  name: string;
  value: number | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string | null;
  responsible?: string | null;
}

const DEFAULT_FILTERS: CrmFilters = {
  search: "",
  sources: [],
  statuses: [],
  tags: [],
  responsibles: [],
  valueCondition: null,
  valueMin: null,
  valueMax: null,
  dateStart: null,
  dateEnd: null,
  sortField: "date",
  sortDirection: "desc",
};

export function useCrmFilters() {
  const [filters, setFilters] = useState<CrmFilters>(DEFAULT_FILTERS);
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem("crm_filter_presets");
    return saved ? JSON.parse(saved) : [];
  });

  const updateFilter = useCallback(<K extends keyof CrmFilters>(
    key: K,
    value: CrmFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.sources.length > 0 ||
      filters.statuses.length > 0 ||
      filters.tags.length > 0 ||
      filters.responsibles.length > 0 ||
      filters.valueCondition !== null ||
      filters.dateStart !== null ||
      filters.dateEnd !== null
    );
  }, [filters]);

  const savePreset = useCallback((name: string) => {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters: { ...filters },
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem("crm_filter_presets", JSON.stringify(updated));
    return newPreset;
  }, [filters, presets]);

  const loadPreset = useCallback((preset: FilterPreset) => {
    setFilters({
      ...preset.filters,
      dateStart: preset.filters.dateStart ? new Date(preset.filters.dateStart) : null,
      dateEnd: preset.filters.dateEnd ? new Date(preset.filters.dateEnd) : null,
    });
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    const updated = presets.filter((p) => p.id !== presetId);
    setPresets(updated);
    localStorage.setItem("crm_filter_presets", JSON.stringify(updated));
  }, [presets]);

  const setDateShortcut = useCallback((shortcut: string) => {
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (shortcut) {
      case "today":
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case "7days":
        start = startOfDay(subDays(today, 7));
        end = endOfDay(today);
        break;
      case "30days":
        start = startOfDay(subDays(today, 30));
        end = endOfDay(today);
        break;
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
    }

    setFilters((prev) => ({ ...prev, dateStart: start, dateEnd: end }));
  }, []);

  const filterLeads = useCallback((leads: Lead[]): Lead[] => {
    let result = leads.filter((lead) => {
      // Global text search (OR across fields)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(searchLower);
        const matchesEmail = lead.email?.toLowerCase().includes(searchLower);
        const matchesPhone = lead.phone?.toLowerCase().includes(searchLower);
        const matchesNotes = lead.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesNotes) {
          return false;
        }
      }

      // Sources filter (OR within group)
      if (filters.sources.length > 0) {
        if (!lead.source || !filters.sources.includes(lead.source)) {
          return false;
        }
      }

      // Status filter (OR within group)
      if (filters.statuses.length > 0) {
        if (!lead.status || !filters.statuses.includes(lead.status)) {
          return false;
        }
      }

      // Tags filter (OR within group)
      if (filters.tags.length > 0) {
        const leadTags = lead.tags || [];
        const hasMatchingTag = filters.tags.some((tag) => leadTags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Responsibles filter (OR within group)
      if (filters.responsibles.length > 0) {
        if (!lead.responsible || !filters.responsibles.includes(lead.responsible)) {
          return false;
        }
      }

      // Value filter
      if (filters.valueCondition && filters.valueMin !== null) {
        const leadValue = lead.value ?? 0;
        
        switch (filters.valueCondition) {
          case "greater":
            if (leadValue <= filters.valueMin) return false;
            break;
          case "less":
            if (leadValue >= filters.valueMin) return false;
            break;
          case "between":
            if (filters.valueMax !== null) {
              if (leadValue < filters.valueMin || leadValue > filters.valueMax) return false;
            }
            break;
        }
      }

      // Date filter
      if (filters.dateStart || filters.dateEnd) {
        const createdAt = lead.created_at ? parseISO(lead.created_at) : null;
        if (!createdAt) return false;

        if (filters.dateStart && filters.dateEnd) {
          if (!isWithinInterval(createdAt, { 
            start: startOfDay(filters.dateStart), 
            end: endOfDay(filters.dateEnd) 
          })) {
            return false;
          }
        } else if (filters.dateStart) {
          if (createdAt < startOfDay(filters.dateStart)) return false;
        } else if (filters.dateEnd) {
          if (createdAt > endOfDay(filters.dateEnd)) return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortField) {
        case "date":
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case "value":
          comparison = (a.value ?? 0) - (b.value ?? 0);
          break;
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
      }

      return filters.sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    setDateShortcut,
    filterLeads,
    setFilters,
  };
}
