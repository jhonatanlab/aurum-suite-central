import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2, Check } from "lucide-react";
import { LeadSidePanel } from "@/components/crm/LeadSidePanel";
import { AdvancedFilters } from "@/components/crm/AdvancedFilters";
import { ContactsTab } from "@/components/crm/ContactsTab";
import { useCrmFilters } from "@/hooks/useCrmFilters";
import { useCrmSettings } from "@/hooks/useCrmSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Stage {
  id: string;
  name: string;
  position: number;
}

const DEFAULT_STAGES = ["Novo", "Qualificado", "Proposta", "Negociação", "Fechado"];

const sources = [
  { id: "trafego_pago", label: "Tráfego Pago" },
  { id: "instagram", label: "Instagram" },
  { id: "influencer", label: "Influencer" },
  { id: "loja", label: "Loja" },
  { id: "outros", label: "Outros" },
];

const leadSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  value: z.number().min(0, "Valor deve ser positivo"),
  phone: z.string().trim().max(20).optional(),
  status: z.string().min(1, "Status é obrigatório"),
});

interface HistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

interface Lead {
  id: string;
  name: string;
  value: number | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  tags: string[] | null;
  product_id?: string | null;
  product_value?: number | null;
  created_at: string | null;
  history?: HistoryEntry[];
}

function DraggableLeadCard({ lead, onClick, isDraggingThis }: { lead: Lead; onClick: () => void; isDraggingThis: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  // When dragging, we hide this card (DragOverlay takes over)
  // When not dragging, no transform needed
  const style: React.CSSProperties = {
    // Keep the space occupied during drag (placeholder)
    visibility: isDragging ? 'hidden' : 'visible',
  };

  // Display product value if set, otherwise fall back to lead value
  const displayValue = lead.product_value ?? lead.value ?? 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-4 bg-card border-border/50 hover:border-primary/30 cursor-grab group touch-none transition-colors duration-150 ${
        isDraggingThis 
          ? "opacity-40 border-dashed border-primary/40" 
          : "hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {lead.name}
          </h4>
          <span className="text-xs text-muted-foreground">#{lead.id.slice(0, 4)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          R$ {displayValue.toLocaleString("pt-BR")}
        </span>
        {lead.product_id && (
          <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
            Produto
          </span>
        )}
      </div>
    </Card>
  );
}

function DragOverlayCard({ lead }: { lead: Lead }) {
  const displayValue = lead.product_value ?? lead.value ?? 0;
  
  return (
    <Card 
      className="p-4 bg-card border-primary/60 cursor-grabbing animate-in zoom-in-95 duration-150"
      style={{
        transform: 'scale(1.03) rotate(1deg)',
        boxShadow: '0 20px 40px -12px hsl(var(--primary) / 0.35), 0 8px 16px -8px hsl(var(--primary) / 0.2)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-foreground">{lead.name}</h4>
          <span className="text-xs text-muted-foreground">#{lead.id.slice(0, 4)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          R$ {displayValue.toLocaleString("pt-BR")}
        </span>
      </div>
    </Card>
  );
}

function DroppableColumn({ 
  stage, 
  leads, 
  onLeadClick, 
  activeLeadId,
  onRename,
  onDelete,
  isFirst,
  isLast,
  stagesCount,
}: { 
  stage: Stage; 
  leads: Lead[]; 
  onLeadClick: (lead: Lead) => void;
  activeLeadId: string | null;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  stagesCount: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const stageLeads = leads.filter((lead) => lead.status === stage.id);

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== stage.name) {
      onRename(stage.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      setEditName(stage.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveRename}
                className="h-8 text-sm font-semibold bg-card border-primary/50"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveRename}>
                <Check className="h-4 w-4 text-primary" />
              </Button>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-foreground">{stage.name}</h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {stageLeads.length}
              </span>
            </>
          )}
        </div>
        
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem 
                onClick={() => {
                  setEditName(stage.name);
                  setIsEditing(true);
                }}
                className="gap-2 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                Renomear
              </DropdownMenuItem>
              {stagesCount > 2 && !isFirst && !isLast && (
                <DropdownMenuItem 
                  onClick={() => onDelete(stage.id)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[300px] p-3 rounded-xl transition-all duration-200 ${
          isOver 
            ? "bg-primary/15 ring-2 ring-primary/40 scale-[1.01]" 
            : "bg-muted/20 ring-1 ring-border/30"
        }`}
      >
        {stageLeads.map((lead) => (
          <DraggableLeadCard 
            key={lead.id} 
            lead={lead} 
            onClick={() => onLeadClick(lead)} 
            isDraggingThis={activeLeadId === lead.id}
          />
        ))}
      </div>
    </div>
  );
}


function NewLeadModal({ onSuccess, stages }: { onSuccess: () => void; stages: Stage[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set default status when stages change
  useEffect(() => {
    if (stages.length > 0 && !status) {
      setStatus(stages[0].id);
    }
  }, [stages, status]);

  const createLead = useMutation({
    mutationFn: async (data: z.infer<typeof leadSchema>) => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      
      const { error } = await supabase.from("leads").insert({
        name: data.name,
        value: data.value,
        phone: data.phone || null,
        status: data.status,
        company_id: company.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead criado com sucesso!" });
      setOpen(false);
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar lead", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setValue("");
    setPhone("");
    setStatus(stages.length > 0 ? stages[0].id : "");
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = leadSchema.safeParse({
      name,
      value: parseFloat(value) || 0,
      phone: phone || undefined,
      status,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    createLead.mutate(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do lead"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="value">Valor Estimado (R$)</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
            {errors.value && <p className="text-xs text-destructive">{errors.value}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone/WhatsApp</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Etapa</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddStageModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addStage = useMutation({
    mutationFn: async (stageName: string) => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      
      // Get current max position
      const { data: existingStages } = await supabase
        .from("crm_stages")
        .select("position")
        .eq("company_id", company.id)
        .order("position", { ascending: false })
        .limit(1);
      
      const maxPosition = existingStages && existingStages.length > 0 ? existingStages[0].position : -1;
      
      const { error } = await supabase.from("crm_stages").insert({
        name: stageName,
        position: maxPosition + 1,
        company_id: company.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
      toast({ title: "Coluna adicionada!" });
      setOpen(false);
      setName("");
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar coluna", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addStage.mutate(name.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/10">
          <Plus className="h-4 w-4" />
          Nova Coluna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Coluna</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stageName">Nome da Coluna *</Label>
            <Input
              id="stageName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Em Análise"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addStage.isPending || !name.trim()}>
              {addStage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CRM() {
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { company } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Advanced filters hook
  const {
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
  } = useCrmFilters();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // Fetch stages from database
  const { data: stages = [], isLoading: stagesLoading, refetch: refetchStages } = useQuery({
    queryKey: ["crm_stages", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("crm_stages")
        .select("id, name, position")
        .eq("company_id", company.id)
        .order("position", { ascending: true });

      if (error) throw error;
      
      // If no stages exist, create default ones
      if (data.length === 0) {
        const defaultStages = DEFAULT_STAGES.map((name, index) => ({
          company_id: company.id,
          name,
          position: index,
        }));
        
        const { data: insertedData, error: insertError } = await supabase
          .from("crm_stages")
          .insert(defaultStages)
          .select("id, name, position");
        
        if (insertError) throw insertError;
        return insertedData as Stage[];
      }
      
      return data as Stage[];
    },
    enabled: !!company?.id,
  });

  const { data: leads = [], isLoading: leadsLoading, refetch } = useQuery({
    queryKey: ["leads", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("leads")
        .select("id, name, value, phone, email, status, source, notes, tags, created_at, history, product_id, product_value")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(lead => ({
        ...lead,
        history: (lead.history as unknown as HistoryEntry[]) || [],
      })) as Lead[];
    },
    enabled: !!company?.id,
  });

  const isLoading = stagesLoading || leadsLoading;

  // Apply advanced filters
  const filteredLeads = useMemo(() => filterLeads(leads), [leads, filterLeads]);

  const updateLeadStage = useMutation({
    mutationFn: async ({ leadId, newStage, oldStage, currentHistory = [] }: { 
      leadId: string; 
      newStage: string; 
      oldStage: string;
      currentHistory?: HistoryEntry[];
    }) => {
      const oldStageName = stages.find(s => s.id === oldStage)?.name || oldStage;
      const newStageName = stages.find(s => s.id === newStage)?.name || newStage;

      // Create history entry for column change
      const newEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: user?.email ?? "Usuário",
        action: "Mudança de coluna",
        details: `De "${oldStageName}" para "${newStageName}"`,
      };

      let updatedHistory = [newEntry, ...currentHistory];
      if (updatedHistory.length > 200) {
        updatedHistory = updatedHistory.slice(0, 200);
      }

      const { error } = await supabase
        .from("leads")
        .update({ 
          status: newStage,
          history: updatedHistory as unknown as any,
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao mover lead", description: error.message, variant: "destructive" });
      refetch();
    },
  });

  // Rename stage mutation
  const renameStage = useMutation({
    mutationFn: async ({ stageId, newName }: { stageId: string; newName: string }) => {
      const { error } = await supabase
        .from("crm_stages")
        .update({ name: newName })
        .eq("id", stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
      toast({ title: "Coluna renomeada!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao renomear", description: error.message, variant: "destructive" });
    },
  });

  // Delete stage mutation
  const deleteStage = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from("crm_stages")
        .delete()
        .eq("id", stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
      toast({ title: "Coluna excluída!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const handleRenameStage = (stageId: string, newName: string) => {
    renameStage.mutate({ stageId, newName });
  };

  const handleDeleteStage = (stageId: string) => {
    deleteStage.mutate(stageId);
  };

  const handleLeadClick = (lead: Lead) => {
    if (!activeLead) {
      setEditingLead(lead);
      setEditModalOpen(true);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
    
    // Capture offset from cursor to card origin using activatorEvent
    const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent;
    const activeRect = event.active.rect.current.initial;
    
    if (activeRect && activatorEvent) {
      let clientX: number, clientY: number;
      
      if ('touches' in activatorEvent) {
        clientX = activatorEvent.touches[0].clientX;
        clientY = activatorEvent.touches[0].clientY;
      } else {
        clientX = activatorEvent.clientX;
        clientY = activatorEvent.clientY;
      }
      
      dragOffsetRef.current = {
        x: clientX - activeRect.left,
        y: clientY - activeRect.top,
      };
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;
    const lead = leads.find((l) => l.id === leadId);

    if (lead && lead.status !== newStage && stages.some((s) => s.id === newStage)) {
      const oldStage = lead.status || "";
      
      // Optimistic update
      queryClient.setQueryData(["leads", company?.id], (old: Lead[] | undefined) =>
        old?.map((l) => (l.id === leadId ? { ...l, status: newStage } : l))
      );

      updateLeadStage.mutate({ 
        leadId, 
        newStage, 
        oldStage,
        currentHistory: lead.history || [],
      });
    }
  };

  const leadsInFunnel = filteredLeads.filter(l => l.status && stages.some(s => s.id === l.status)).length;

  const handleMoveToStage = (leadId: string, stageId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      updateLeadStage.mutate({
        leadId,
        newStage: stageId,
        oldStage: lead.status || "",
        currentHistory: lead.history || [],
      });
    }
  };

  return (
    <AppLayout title="CRM">
      <Tabs defaultValue="funil" className="space-y-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="funil">Funil</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
            </TabsList>
            <span className="text-sm text-muted-foreground">
              {leadsInFunnel} leads no funil | {leads.length} contatos cadastrados
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AddStageModal onSuccess={() => refetchStages()} />
            <NewLeadModal onSuccess={() => refetch()} stages={stages} />
          </div>
        </div>

        <TabsContent value="funil" className="mt-0 space-y-6">
          {/* Advanced Filters */}
          <AdvancedFilters
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            presets={presets}
            savePreset={savePreset}
            loadPreset={loadPreset}
            deletePreset={deletePreset}
            setDateShortcut={setDateShortcut}
            stages={stages}
            sources={sources}
            leadsCount={filteredLeads.length}
            isFiltering={isLoading}
          />

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always,
              },
            }}
          >
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6 min-w-max">
                {stages.map((stage, index) => (
                  <DroppableColumn
                    key={stage.id}
                    stage={stage}
                    leads={filteredLeads}
                    onLeadClick={handleLeadClick}
                    activeLeadId={activeLead?.id || null}
                    onRename={handleRenameStage}
                    onDelete={handleDeleteStage}
                    isFirst={index === 0}
                    isLast={index === stages.length - 1}
                    stagesCount={stages.length}
                  />
                ))}
              </div>
            </div>

            <DragOverlay 
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
              modifiers={[
                ({ transform }) => ({
                  ...transform,
                  x: transform.x + dragOffsetRef.current.x,
                  y: transform.y + dragOffsetRef.current.y,
                }),
              ]}
            >
              {activeLead ? <DragOverlayCard lead={activeLead} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <LeadSidePanel
        lead={editingLead}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => refetch()}
        stages={stages}
      />
    </AppLayout>
  );
}
