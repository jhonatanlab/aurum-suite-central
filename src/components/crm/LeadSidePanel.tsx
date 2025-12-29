import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Trash2, Send, User, MessageSquare, History, Plus, X, Mail, Phone, Calendar } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const sourceOptions = [
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
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  status: z.string().min(1, "Status é obrigatório"),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

interface Stage {
  id: string;
  name: string;
  position: number;
}

interface HistoryEntry {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by: string | null;
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
  created_at: string | null;
}

interface ChatMessage {
  id: string;
  text: string;
  sent: boolean;
  timestamp: Date;
}

interface LeadSidePanelProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LeadSidePanel({ lead, open, onOpenChange, onSuccess }: LeadSidePanelProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("outros");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Track original values for history
  const [originalStatus, setOriginalStatus] = useState("");
  const [originalSource, setOriginalSource] = useState("");
  const [originalTags, setOriginalTags] = useState<string[]>([]);
  
  // Note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const { toast } = useToast();
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch stages from database
  const { data: stages = [] } = useQuery({
    queryKey: ["crm_stages", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("crm_stages")
        .select("id, name, position")
        .eq("company_id", company.id)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!company?.id,
  });

  // Fetch history for this lead
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["crm_history", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];

      const { data, error } = await supabase
        .from("crm_history")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HistoryEntry[];
    },
    enabled: !!lead?.id && open,
  });

  // Sync form with lead data
  useEffect(() => {
    if (lead && open) {
      setName(lead.name);
      setValue(lead.value?.toString() || "");
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setStatus(lead.status || (stages.length > 0 ? stages[0].id : ""));
      setSource(lead.source || "outros");
      setNotes(lead.notes || "");
      setTags(lead.tags || []);
      setErrors({});
      
      // Set original values for tracking changes
      setOriginalStatus(lead.status || "");
      setOriginalSource(lead.source || "outros");
      setOriginalTags(lead.tags || []);
    }
  }, [lead?.id, open, stages]);

  // Add history entry
  const addHistoryEntry = async (type: string, description: string) => {
    if (!lead?.id) return;

    await supabase.from("crm_history").insert({
      lead_id: lead.id,
      type,
      description,
      created_by: user?.email || null,
    });

    refetchHistory();
  };

  const updateLead = useMutation({
    mutationFn: async (data: z.infer<typeof leadSchema>) => {
      if (!lead?.id) throw new Error("Lead não encontrado");
      
      // Check for changes that need history entries
      const historyPromises: Promise<void>[] = [];

      // Status change
      if (data.status !== originalStatus && originalStatus) {
        const oldStageName = stages.find(s => s.id === originalStatus)?.name || originalStatus;
        const newStageName = stages.find(s => s.id === data.status)?.name || data.status;
        historyPromises.push(
          addHistoryEntry("status_update", `Status alterado de "${oldStageName}" para "${newStageName}"`)
        );
      }

      // Source change
      if (data.source !== originalSource && originalSource) {
        const oldSourceLabel = sourceOptions.find(s => s.id === originalSource)?.label || originalSource;
        const newSourceLabel = sourceOptions.find(s => s.id === data.source)?.label || data.source;
        historyPromises.push(
          addHistoryEntry("source_update", `Origem alterada de "${oldSourceLabel}" para "${newSourceLabel}"`)
        );
      }

      // Tags changes
      const addedTags = (data.tags || []).filter(t => !originalTags.includes(t));
      const removedTags = originalTags.filter(t => !(data.tags || []).includes(t));

      for (const tag of addedTags) {
        historyPromises.push(addHistoryEntry("tag_added", `Tag adicionada: "${tag}"`));
      }
      for (const tag of removedTags) {
        historyPromises.push(addHistoryEntry("tag_removed", `Tag removida: "${tag}"`));
      }

      // Execute all history entries
      await Promise.all(historyPromises);

      const { error } = await supabase
        .from("leads")
        .update({
          name: data.name,
          value: data.value,
          phone: data.phone || null,
          email: data.email || null,
          status: data.status,
          source: data.source || null,
          notes: data.notes || null,
          tags: data.tags || [],
        })
        .eq("id", lead.id);
      
      if (error) throw error;

      // Update original values after successful save
      setOriginalStatus(data.status);
      setOriginalSource(data.source || "outros");
      setOriginalTags(data.tags || []);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead atualizado com sucesso!" });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar lead", description: error.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async () => {
      if (!lead?.id) throw new Error("Lead não encontrado");
      
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", lead.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead excluído com sucesso!" });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir lead", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      if (!lead?.id) throw new Error("Lead não encontrado");

      await addHistoryEntry("manual_note", noteText);
    },
    onSuccess: () => {
      toast({ title: "Nota adicionada!" });
      setNoteModalOpen(false);
      setNewNote("");
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar nota", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = leadSchema.safeParse({
      name,
      value: parseFloat(value) || 0,
      phone: phone || undefined,
      email: email || undefined,
      status,
      source,
      notes,
      tags,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    updateLead.mutate(result.data);
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sent: true,
      timestamp: new Date(),
    };
    
    setChatMessages((prev) => [...prev, message]);
    setNewMessage("");
    
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Mensagem recebida! (Integração WhatsApp em breve)",
          sent: false,
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  const getSourceLabel = (sourceId: string) => {
    return sourceOptions.find((s) => s.id === sourceId)?.label || sourceId;
  };

  const getHistoryTypeLabel = (type: string) => {
    switch (type) {
      case "manual_note": return "Nota manual";
      case "status_update": return "Alteração de status";
      case "source_update": return "Alteração de origem";
      case "tag_added": return "Tag adicionada";
      case "tag_removed": return "Tag removida";
      case "lead_created": return "Lead criado";
      default: return type;
    }
  };

  const getHistoryTypeColor = (type: string) => {
    switch (type) {
      case "manual_note": return "bg-blue-500";
      case "status_update": return "bg-primary";
      case "source_update": return "bg-purple-500";
      case "tag_added": return "bg-green-500";
      case "tag_removed": return "bg-red-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-border/50 bg-card/50">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="text-xl font-semibold text-foreground">
                  {lead?.name || "Lead"}
                </SheetTitle>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">
                    R$ {(lead?.value || 0).toLocaleString("pt-BR")}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {getSourceLabel(lead?.source || "outros")}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/50">
              <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Informações</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="flex-1 mt-0 flex flex-col overflow-hidden">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* Scrollable content area */}
                <ScrollArea className="flex-1 px-6 py-4">
                  <div className="space-y-4">
                    {/* Nome */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground">Nome *</Label>
                      <Input
                        id="edit-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do lead"
                        className={`h-10 ${errors.name ? "border-destructive" : ""}`}
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    
                    {/* Telefone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-phone" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        Telefone / WhatsApp
                      </Label>
                      <Input
                        id="edit-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="h-10"
                      />
                    </div>

                    {/* E-mail */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-email" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        E-mail
                      </Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className={`h-10 ${errors.email ? "border-destructive" : ""}`}
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    
                    {/* Origem e Status em row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-source" className="text-xs font-medium text-muted-foreground">Origem</Label>
                        <Select value={source} onValueChange={setSource}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceOptions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-status" className="text-xs font-medium text-muted-foreground">Etapa</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger className="h-10">
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
                    </div>

                    {/* Valor */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-value" className="text-xs font-medium text-muted-foreground">Valor Estimado (R$)</Label>
                      <Input
                        id="edit-value"
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="h-10"
                      />
                      {errors.value && <p className="text-xs text-destructive">{errors.value}</p>}
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md border border-border/50 bg-background">
                        {tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="gap-1 text-xs py-0.5 px-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                        {tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhuma tag</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nova tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          className="flex-1 h-9"
                        />
                        <Button type="button" size="icon" variant="outline" onClick={handleAddTag} className="h-9 w-9">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-notes" className="text-xs font-medium text-muted-foreground">Observações</Label>
                      <Textarea
                        id="edit-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Adicione observações sobre o lead..."
                        className="min-h-[80px] resize-none text-sm"
                      />
                    </div>

                    {/* Data de criação */}
                    <div className="pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Criado em:</span>
                        <span className="text-foreground/80">
                          {lead?.created_at 
                            ? format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : "—"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                {/* Fixed footer with actions */}
                <div className="flex justify-between px-6 py-4 border-t border-border/30 shrink-0 bg-background">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteLead.mutate()}
                    disabled={deleteLead.isPending}
                    className="gap-2"
                  >
                    {deleteLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Excluir
                  </Button>
                  <Button type="submit" disabled={updateLead.isPending} size="sm">
                    {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma mensagem ainda</p>
                      <p className="text-xs mt-1">Integração WhatsApp em breve!</p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sent
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.sent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-border/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden mt-0">
              {/* Header with title and add button */}
              <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Histórico</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setNoteModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova nota
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-6 py-4">
                  {history.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Nenhum histórico ainda</p>
                      <p className="text-xs mt-1 opacity-70">As alterações serão registradas automaticamente</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/50" />
                      
                      <div className="space-y-4">
                        {history.map((entry) => (
                          <div key={entry.id} className="relative pl-6">
                            {/* Timeline dot */}
                            <div className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-background ${getHistoryTypeColor(entry.type)}`} />
                            
                            <div className="space-y-1">
                              {/* Date and time */}
                              <p className="text-[11px] text-muted-foreground font-medium">
                                {format(new Date(entry.created_at), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              
                              {/* Type badge */}
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="secondary" 
                                  className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-border/50"
                                >
                                  {getHistoryTypeLabel(entry.type)}
                                </Badge>
                              </div>
                              
                              {/* Description */}
                              <p className="text-sm text-foreground leading-relaxed">
                                {entry.description}
                              </p>
                              
                              {/* Author */}
                              {entry.created_by && (
                                <p className="text-[11px] text-muted-foreground/70">
                                  por {entry.created_by}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Add Note Modal */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Digite sua nota..."
              className="min-h-[120px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => addNoteMutation.mutate(newNote)}
              disabled={!newNote.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
