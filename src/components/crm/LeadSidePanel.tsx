import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, MessageCircle, Phone, Mail, User, Building, Calendar, FileText, History, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HistoryEntry, addLeadHistoryEntry } from "@/hooks/useLeadHistory";
import { useTags } from "@/hooks/useTags";
import { TagMultiSelect } from "./TagMultiSelect";
import type { Json } from "@/integrations/supabase/types";

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
  history?: HistoryEntry[];
}

interface Stage {
  id: string;
  name: string;
  position: number;
}

interface LeadSidePanelProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  stages: Stage[];
}

const sourceOptions = [
  { id: "trafego_pago", label: "Tráfego Pago" },
  { id: "instagram", label: "Instagram" },
  { id: "influencer", label: "Influencer" },
  { id: "loja", label: "Loja" },
  { id: "outros", label: "Outros" },
];

export function LeadSidePanel({ lead, open, onOpenChange, onSuccess, stages }: LeadSidePanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getTagById } = useTags();

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [originalTags, setOriginalTags] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Original values for change detection
  const [originalValues, setOriginalValues] = useState({
    name: "",
    phone: "",
    email: "",
    source: "",
    status: "",
    notes: "",
  });

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Populate form when lead changes
  useEffect(() => {
    if (lead) {
      setName(lead.name || "");
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setSource(lead.source || "");
      setStatus(lead.status || "");
      setNotes(lead.notes || "");
      setCpfCnpj("");
      const leadTags = lead.tags || [];
      setTags(leadTags);
      setOriginalTags(leadTags);
      setHistory((lead.history as HistoryEntry[]) || []);
      setOriginalValues({
        name: lead.name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        source: lead.source || "",
        status: lead.status || "",
        notes: lead.notes || "",
      });
    }
  }, [lead]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [open]);

  // Get sorted history (most recent first, max 50 for display)
  const displayHistory = useMemo(() => {
    return history
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }, [history]);

  // Helper to get stage name
  const getStageName = (stageId: string) => {
    return stages.find(s => s.id === stageId)?.name || stageId;
  };

  // Helper to format value (empty/null → "vazio")
  const formatValue = (value: string | null | undefined): string => {
    if (!value || value.trim() === "" || value === "—") return "vazio";
    return value;
  };

  // Detect changed fields and build description
  const getChangedFieldsDescription = () => {
    const changes: string[] = [];
    
    if (name.trim() !== originalValues.name) {
      changes.push(`Nome: ${formatValue(originalValues.name)} → ${formatValue(name.trim())}`);
    }
    if (phone.trim() !== originalValues.phone) {
      changes.push(`Telefone: ${formatValue(originalValues.phone)} → ${formatValue(phone.trim())}`);
    }
    if (email.trim() !== originalValues.email) {
      changes.push(`Email: ${formatValue(originalValues.email)} → ${formatValue(email.trim())}`);
    }
    if (source !== originalValues.source) {
      const oldSourceLabel = sourceOptions.find(s => s.id === originalValues.source)?.label || originalValues.source;
      const newSourceLabel = sourceOptions.find(s => s.id === source)?.label || source;
      changes.push(`Origem: ${formatValue(oldSourceLabel)} → ${formatValue(newSourceLabel)}`);
    }
    if (status !== originalValues.status) {
      const oldStage = getStageName(originalValues.status);
      const newStage = getStageName(status);
      changes.push(`Etapa: ${formatValue(oldStage)} → ${formatValue(newStage)}`);
    }
    
    return changes;
  };

  // Update lead mutation
  const updateLead = useMutation({
    mutationFn: async () => {
      if (!lead?.id) throw new Error("Lead não encontrado");

      const changedFields = getChangedFieldsDescription();
      let updatedHistory = history;

      // Add history entry for info changes (excluding notes which are handled separately)
      if (changedFields.length > 0) {
        const result = await addLeadHistoryEntry({
          leadId: lead.id,
          action: "Edição de informações",
          details: changedFields.join("; "),
          userEmail: user?.email,
          currentHistory: history,
        });
        if (result) updatedHistory = result;
      }

      // Check if notes changed
      if (notes.trim() !== originalValues.notes) {
        const noteResult = await addLeadHistoryEntry({
          leadId: lead.id,
          action: "Nota adicionada/editada",
          details: notes.trim().slice(0, 100) + (notes.trim().length > 100 ? "..." : ""),
          userEmail: user?.email,
          currentHistory: updatedHistory,
        });
        if (noteResult) updatedHistory = noteResult;
      }

      const { error } = await supabase
        .from("leads")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          source: source || null,
          status: status || null,
          notes: notes.trim() || null,
          history: updatedHistory as unknown as Json,
        })
        .eq("id", lead.id);

      if (error) throw error;
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

  // Delete lead mutation
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
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir lead", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    updateLead.mutate();
  };

  const handleDelete = () => {
    deleteLead.mutate();
  };

  // Handle tag changes with history logging
  const handleTagsChange = async (newTagIds: string[]) => {
    if (!lead?.id) return;

    const addedTags = newTagIds.filter((id) => !originalTags.includes(id));
    const removedTags = originalTags.filter((id) => !newTagIds.includes(id));

    let currentHistory = history || [];

    // Log added tags
    for (const tagId of addedTags) {
      const tag = getTagById(tagId);
      const tagName = tag?.name || tagId;
      const result = await addLeadHistoryEntry({
        leadId: lead.id,
        action: "Tag adicionada",
        details: tagName,
        userEmail: user?.email,
        currentHistory,
      });
      if (result) currentHistory = result;
    }

    // Log removed tags
    for (const tagId of removedTags) {
      const tag = getTagById(tagId);
      const tagName = tag?.name || tagId;
      const result = await addLeadHistoryEntry({
        leadId: lead.id,
        action: "Tag removida",
        details: tagName,
        userEmail: user?.email,
        currentHistory,
      });
      if (result) currentHistory = result;
    }

    // Update database
    const { error } = await supabase
      .from("leads")
      .update({
        tags: newTagIds,
        history: currentHistory as unknown as Json,
      })
      .eq("id", lead.id);

    if (error) {
      toast({ title: "Erro ao atualizar tags", description: error.message, variant: "destructive" });
      return;
    }

    setTags(newTagIds);
    setOriginalTags(newTagIds);
    setHistory(currentHistory);
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
    if (digits.length <= 6) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
    if (digits.length <= 11) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
  };

  if (!open || !lead) return null;

  // Render via Portal to escape any layout constraints
  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 animate-in fade-in-0 duration-200"
        style={{ zIndex: 99998 }}
        onClick={() => onOpenChange(false)}
      />

      {/* Side Panel */}
      <div 
        className="fixed top-0 right-0 h-screen w-[480px] max-w-[100vw] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        style={{ zIndex: 99999 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-foreground truncate">
                {lead.name}
              </h2>
              <div className="flex flex-col gap-1 mt-2">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="informacoes" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 mx-6 mt-4 bg-secondary/50 p-1">
            <TabsTrigger value="informacoes" className="flex-1 data-[state=active]:bg-card data-[state=active]:text-primary">
              Informações
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 data-[state=active]:bg-card data-[state=active]:text-primary">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex-1 data-[state=active]:bg-card data-[state=active]:text-primary">
              Conversa
            </TabsTrigger>
          </TabsList>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Informações Tab */}
            <TabsContent value="informacoes" className="m-0 p-6 space-y-6">
              {/* Dados Principais */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <User className="h-4 w-4" />
                  <span>Dados Principais</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome do lead"
                      className="bg-background border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="+55 (11) 99999-9999"
                      className="bg-background border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="bg-background border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Origem</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="bg-background border-border/50">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent className="z-[100000]">
                        {sourceOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Etapa do Lead</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="bg-background border-border/50">
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                      <SelectContent className="z-[100000]">
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Dados Adicionais */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Building className="h-4 w-4" />
                  <span>Dados Adicionais</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpfCnpj">CPF/CNPJ (opcional)</Label>
                    <Input
                      id="cpfCnpj"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      className="bg-background border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Cadastro
                    </Label>
                    <Input
                      value={lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                      disabled
                      className="bg-secondary/50 border-border/30 text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anotações sobre o lead..."
                      rows={4}
                      className="bg-background border-border/50 focus:border-primary resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Tag className="h-4 w-4" />
                  <span>Tags</span>
                </div>

                <TagMultiSelect
                  value={tags}
                  onChange={handleTagsChange}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteLead.isPending}
                >
                  Excluir Lead
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateLead.isPending}
                >
                  {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="m-0 p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <History className="h-4 w-4" />
                <span>Histórico de Atividades</span>
              </div>

              {displayHistory.length > 0 ? (
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border/50" />

                  <div className="space-y-4">
                    {displayHistory.map((item) => {
                      // Parse details to show each change on a separate line
                      const detailLines = item.details
                        ? item.details.split("; ").map(line => {
                            // Clean up any remaining quotes or dashes
                            return line
                              .replace(/"/g, "")
                              .replace(/—/g, "vazio")
                              .replace(/__/g, "vazio");
                          })
                        : [];

                      return (
                        <div key={item.id} className="relative pl-7">
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-card" />
                          </div>

                          {/* Event card */}
                          <div className="bg-secondary/30 rounded-lg p-3 border border-border/30">
                            {/* Date and time */}
                            <div className="text-sm font-medium text-foreground">
                              {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                            
                            {/* User */}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.user}
                            </div>
                            
                            {/* Action type */}
                            <div className="text-sm font-medium text-primary mt-2">
                              {item.action}
                            </div>
                            
                            {/* Details - each change on its own line */}
                            {detailLines.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {detailLines.map((line, idx) => (
                                  <p key={idx} className="text-sm text-muted-foreground">
                                    {line}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                    <History className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum histórico</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    As atividades do lead aparecerão aqui conforme você fizer alterações.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="m-0 p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Conversa (WhatsApp)</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Área de mensagens WhatsApp — integração futura.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="z-[100000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead "{lead.name}" será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}
