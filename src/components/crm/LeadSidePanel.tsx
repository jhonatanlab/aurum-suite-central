import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, User, History, Plus, X, Mail, Phone, DollarSign, Tag, Clock, MessageCircle } from "lucide-react";
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
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newNote, setNewNote] = useState("");

  const [originalStatus, setOriginalStatus] = useState("");
  const [originalSource, setOriginalSource] = useState("");
  const [originalTags, setOriginalTags] = useState<string[]>([]);

  const { toast } = useToast();
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    if (lead && open) {
      setName(lead.name);
      setValue(lead.value?.toString() || "");
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setStatus(lead.status || (stages.length > 0 ? stages[0].id : ""));
      setSource(lead.source || "outros");
      setTags(lead.tags || []);
      setErrors({});
      setOriginalStatus(lead.status || "");
      setOriginalSource(lead.source || "outros");
      setOriginalTags(lead.tags || []);
    }
  }, [lead?.id, open, stages]);

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

      const historyPromises: Promise<void>[] = [];

      if (data.status !== originalStatus && originalStatus) {
        const oldStageName = stages.find((s) => s.id === originalStatus)?.name || originalStatus;
        const newStageName = stages.find((s) => s.id === data.status)?.name || data.status;
        historyPromises.push(addHistoryEntry("status_update", `Status alterado de "${oldStageName}" para "${newStageName}"`));
      }

      if (data.source !== originalSource && originalSource) {
        const oldSourceLabel = sourceOptions.find((s) => s.id === originalSource)?.label || originalSource;
        const newSourceLabel = sourceOptions.find((s) => s.id === data.source)?.label || data.source;
        historyPromises.push(addHistoryEntry("source_update", `Origem alterada de "${oldSourceLabel}" para "${newSourceLabel}"`));
      }

      const addedTags = (data.tags || []).filter((t) => !originalTags.includes(t));
      const removedTags = originalTags.filter((t) => !(data.tags || []).includes(t));

      for (const tag of addedTags) {
        historyPromises.push(addHistoryEntry("tag_added", `Tag adicionada: "${tag}"`));
      }
      for (const tag of removedTags) {
        historyPromises.push(addHistoryEntry("tag_removed", `Tag removida: "${tag}"`));
      }

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
          tags: data.tags || [],
        })
        .eq("id", lead.id);

      if (error) throw error;

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
      const { error } = await supabase.from("leads").delete().eq("id", lead.id);
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
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const getHistoryTypeLabel = (type: string) => {
    switch (type) {
      case "manual_note": return "Nota";
      case "status_update": return "Status";
      case "source_update": return "Origem";
      case "tag_added": return "Tag +";
      case "tag_removed": return "Tag -";
      default: return "Atualização";
    }
  };

  const getHistoryTypeBadgeClass = (type: string) => {
    switch (type) {
      case "manual_note": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "status_update": return "bg-primary/20 text-primary border-primary/30";
      case "source_update": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "tag_added": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "tag_removed": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-l border-border/50 bg-background">
        {/* Header */}
        <div className="p-6 border-b border-border/30 bg-card/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">{lead?.name || "Lead"}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                  <DollarSign className="h-3 w-3" />
                  R$ {(lead?.value || 0).toLocaleString("pt-BR")}
                </Badge>
                {tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-muted/60 text-muted-foreground">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs bg-muted/60 text-muted-foreground">
                    +{tags.length - 2}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-4 bg-muted/30 h-11">
            <TabsTrigger value="info" className="gap-2 data-[state=active]:bg-background">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Informações</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-background">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2 data-[state=active]:bg-background">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Informações */}
          <TabsContent value="info" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Card Dados do Cliente */}
                  <Card className="border-border/40 shadow-sm bg-card/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Dados do Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Nome *</Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nome do lead"
                          className={`h-11 bg-background ${errors.name ? "border-destructive" : "border-border/50"}`}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          Telefone
                        </Label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="h-11 bg-background border-border/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          E-mail
                        </Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className={`h-11 bg-background ${errors.email ? "border-destructive" : "border-border/50"}`}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Dados Comerciais */}
                  <Card className="border-border/40 shadow-sm bg-card/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Dados Comerciais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Origem</Label>
                        <Select value={source} onValueChange={setSource}>
                          <SelectTrigger className="h-11 bg-background border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceOptions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Status / Etapa</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger className="h-11 bg-background border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5" />
                          Tags
                        </Label>
                        <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-lg border border-border/50 bg-background">
                          {tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="gap-1 text-xs py-1 px-2 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              {tag}
                              <X className="h-3 w-3" />
                            </Badge>
                          ))}
                          {tags.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma tag</span>}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Adicionar tag..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                            className="flex-1 h-10 bg-background border-border/50"
                          />
                          <Button type="button" variant="outline" onClick={handleAddTag} className="h-10 px-4">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              {/* Footer Fixo */}
              <div className="flex justify-between items-center p-6 border-t border-border/30 bg-background/80 backdrop-blur-sm">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="gap-2" disabled={deleteLead.isPending}>
                      {deleteLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Excluir Lead
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteLead.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="submit" disabled={updateLead.isPending} className="gap-2">
                  {updateLead.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Aba Histórico */}
          <TabsContent value="history" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Card Adicionar Nota */}
                <Card className="border-border/40 shadow-sm bg-card/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      Adicionar Nota
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Digite sua nota..."
                      className="min-h-[80px] bg-background border-border/50 resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => addNoteMutation.mutate(newNote)}
                        disabled={!newNote.trim() || addNoteMutation.isPending}
                        className="gap-2"
                      >
                        {addNoteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Adicionar Nota
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Lista de Histórico */}
                <Card className="border-border/40 shadow-sm bg-card/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      Histórico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhum histórico ainda</p>
                        <p className="text-xs mt-1 opacity-70">As alterações serão registradas automaticamente</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {history.map((entry) => (
                          <div key={entry.id} className="p-4 rounded-lg border border-border/30 bg-background/50">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className={`text-[11px] px-2 py-0.5 ${getHistoryTypeBadgeClass(entry.type)}`}>
                                {getHistoryTypeLabel(entry.type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{entry.description}</p>
                            {entry.created_by && (
                              <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.created_by}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Aba Chat - Placeholder */}
          <TabsContent value="chat" className="flex-1 flex items-center justify-center mt-0">
            <div className="text-center text-muted-foreground p-6">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Chat</h3>
              <p className="text-sm opacity-70">Funcionalidade em breve.</p>
            </div>
          </TabsContent>

          {/* Aba WhatsApp - Placeholder */}
          <TabsContent value="whatsapp" className="flex-1 flex items-center justify-center mt-0">
            <div className="text-center text-muted-foreground p-6">
              <Phone className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">WhatsApp</h3>
              <p className="text-sm opacity-70">Integração em breve.</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
