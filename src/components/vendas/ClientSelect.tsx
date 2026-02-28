import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Search, Plus, Check, ChevronsUpDown, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { originOptions } from "./EditSaleModal";

interface ClientSelectProps {
  value: string;
  onChange: (value: string) => void;
  onOriginChange?: (origin: string) => void;
  originValue?: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export function ClientSelect({ value, onChange, onOriginChange, originValue }: ClientSelectProps) {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: leads } = useQuery({
    queryKey: ["leads-pdv", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, email")
        .eq("company_id", company.id)
        .order("name");
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!company?.id,
  });

  const filtered = leads?.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  });

  const selectedLead = leads?.find((l) => l.id === value);

  const handleCreate = async () => {
    if (!newName.trim() || !company?.id) {
      toast.error("Nome é obrigatório");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          company_id: company.id,
          name: newName.trim(),
          phone: newPhone.trim() || null,
          email: newEmail.trim() || null,
          source: newOrigin || "manual",
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["leads-pdv"] });
      onChange(data.id);
      // Propagate origin to parent
      if (newOrigin && onOriginChange) {
        onOriginChange(newOrigin);
      }
      setShowNewForm(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewOrigin("");
      setOpen(false);
      toast.success("Cliente criado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao criar cliente: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground flex items-center gap-2">
        <User className="h-4 w-4" />
        Cliente
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-card border-border focus:border-primary text-left font-normal h-10"
          >
            <span className={cn("truncate", !selectedLead && "text-muted-foreground")}>
              {selectedLead ? selectedLead.name : "Venda sem cliente"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {value && value !== "none" && (
                <X
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("none");
                  }}
                />
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border" align="start">
          {!showNewForm ? (
            <div className="flex flex-col">
              {/* Search */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm bg-secondary border-border"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-48 overflow-y-auto p-1">
                <button
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors flex items-center gap-2",
                    (!value || value === "none") && "bg-secondary"
                  )}
                  onClick={() => {
                    onChange("none");
                    setOpen(false);
                  }}
                >
                  {(!value || value === "none") && <Check className="h-3.5 w-3.5 text-primary" />}
                  <span className="text-muted-foreground">Venda sem cliente</span>
                </button>
                {filtered?.map((lead) => (
                  <button
                    key={lead.id}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors flex items-center gap-2",
                      value === lead.id && "bg-secondary"
                    )}
                    onClick={() => {
                      onChange(lead.id);
                      setOpen(false);
                    }}
                  >
                    {value === lead.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{lead.name}</p>
                      {(lead.phone || lead.email) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.phone || lead.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
                {filtered?.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground text-center">
                    Nenhum cliente encontrado
                  </p>
                )}
              </div>

              {/* Create new */}
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setShowNewForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Novo Cliente</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowNewForm(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Nome *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-sm bg-secondary border-border"
                  autoFocus
                />
                <Input
                  placeholder="Telefone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-8 text-sm bg-secondary border-border"
                />
                <Input
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-8 text-sm bg-secondary border-border"
                />
                <Select value={newOrigin} onValueChange={setNewOrigin}>
                  <SelectTrigger className="h-8 text-sm bg-secondary border-border">
                    <SelectValue placeholder="Origem do cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {originOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? "Criando..." : "Criar Cliente"}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
