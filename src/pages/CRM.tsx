import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Search, Settings, Loader2, X, CalendarIcon, Filter } from "lucide-react";
import { LeadSidePanel } from "@/components/crm/LeadSidePanel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

const stages = [
  { id: "novo", title: "Novo Lead" },
  { id: "qualificado", title: "Qualificado" },
  { id: "proposta", title: "Proposta Enviada" },
  { id: "negociacao", title: "Negociação" },
];

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
  status: z.enum(["novo", "qualificado", "proposta", "negociacao"]),
});

interface Lead {
  id: string;
  name: string;
  value: number | null;
  phone: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
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
          R$ {(lead.value || 0).toLocaleString("pt-BR")}
        </span>
      </div>
    </Card>
  );
}

function DragOverlayCard({ lead }: { lead: Lead }) {
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
          R$ {(lead.value || 0).toLocaleString("pt-BR")}
        </span>
      </div>
    </Card>
  );
}

function DroppableColumn({ 
  stage, 
  leads, 
  onLeadClick, 
  activeLeadId 
}: { 
  stage: typeof stages[0]; 
  leads: Lead[]; 
  onLeadClick: (lead: Lead) => void;
  activeLeadId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const stageLeads = leads.filter((lead) => lead.status === stage.id);

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{stage.title}</h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {stageLeads.length}
          </span>
        </div>
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


function NewLeadModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string>("novo");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    setStatus("novo");
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
                    {s.title}
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

export default function CRM() {
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateStart, setFilterDateStart] = useState<Date | undefined>(undefined);
  const [filterDateEnd, setFilterDateEnd] = useState<Date | undefined>(undefined);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["leads", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("leads")
        .select("id, name, value, phone, status, source, notes, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Lead & { created_at: string })[];
    },
    enabled: !!company?.id,
  });

  const updateLeadStage = useMutation({
    mutationFn: async ({ leadId, newStage }: { leadId: string; newStage: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStage })
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

  const hasActiveFilters = filterSource !== "all" || filterStatus !== "all" || filterDateStart || filterDateEnd;

  const clearFilters = () => {
    setFilterSource("all");
    setFilterStatus("all");
    setFilterDateStart(undefined);
    setFilterDateEnd(undefined);
    setSearch("");
  };

  const filteredLeads = leads.filter((lead) => {
    // Text search
    if (search && !lead.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Source filter
    if (filterSource !== "all" && lead.source !== filterSource) {
      return false;
    }
    // Status filter
    if (filterStatus !== "all" && lead.status !== filterStatus) {
      return false;
    }
    // Date range filter
    if (filterDateStart || filterDateEnd) {
      const createdAt = lead.created_at ? parseISO(lead.created_at) : null;
      if (!createdAt) return false;
      
      if (filterDateStart && filterDateEnd) {
        if (!isWithinInterval(createdAt, { start: startOfDay(filterDateStart), end: endOfDay(filterDateEnd) })) {
          return false;
        }
      } else if (filterDateStart) {
        if (createdAt < startOfDay(filterDateStart)) return false;
      } else if (filterDateEnd) {
        if (createdAt > endOfDay(filterDateEnd)) return false;
      }
    }
    return true;
  });

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
      // Optimistic update
      queryClient.setQueryData(["leads", company?.id], (old: Lead[] | undefined) =>
        old?.map((l) => (l.id === leadId ? { ...l, status: newStage } : l))
      );

      updateLeadStage.mutate({ leadId, newStage });
    }
  };

  return (
    <AppLayout title="CRM">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border/50 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Editar Pipeline
            </Button>
            <NewLeadModal onSuccess={() => refetch()} />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-3 items-center p-4 bg-card/50 border border-border/30 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtros:</span>
          </div>

          {/* Source Filter */}
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[150px] h-9 bg-card border-border/50">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Origens</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-9 bg-card border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range - Start */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-[130px] justify-start text-left font-normal bg-card border-border/50",
                  !filterDateStart && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDateStart ? format(filterDateStart, "dd/MM/yy", { locale: ptBR }) : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDateStart}
                onSelect={setFilterDateStart}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Date Range - End */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-[130px] justify-start text-left font-normal bg-card border-border/50",
                  !filterDateEnd && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDateEnd ? format(filterDateEnd, "dd/MM/yy", { locale: ptBR }) : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDateEnd}
                onSelect={setFilterDateEnd}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>

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
                {stages.map((stage) => (
                  <DroppableColumn
                    key={stage.id}
                    stage={stage}
                    leads={filteredLeads}
                    onLeadClick={handleLeadClick}
                    activeLeadId={activeLead?.id || null}
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
      />
    </AppLayout>
  );
}
