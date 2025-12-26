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
import { Loader2, Trash2, Send, User, MessageSquare, StickyNote, History } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const stages = [
  { id: "novo", title: "Novo Lead" },
  { id: "qualificado", title: "Qualificado" },
  { id: "proposta", title: "Proposta Enviada" },
  { id: "negociacao", title: "Negociação" },
];

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
  status: z.enum(["novo", "qualificado", "proposta", "negociacao"]),
  source: z.string().optional(),
  notes: z.string().optional(),
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
  const [status, setStatus] = useState("novo");
  const [source, setSource] = useState("outros");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync form with lead data
  useEffect(() => {
    if (lead && open) {
      setName(lead.name);
      setValue(lead.value?.toString() || "");
      setPhone(lead.phone || "");
      setStatus(lead.status || "novo");
      setSource(lead.source || "outros");
      setNotes(lead.notes || "");
      setErrors({});
    }
  }, [lead?.id, open]);

  const updateLead = useMutation({
    mutationFn: async (data: z.infer<typeof leadSchema>) => {
      if (!lead?.id) throw new Error("Lead não encontrado");
      
      const { error } = await supabase
        .from("leads")
        .update({
          name: data.name,
          value: data.value,
          phone: data.phone || null,
          status: data.status,
          source: data.source || null,
          notes: data.notes || null,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = leadSchema.safeParse({
      name,
      value: parseFloat(value) || 0,
      phone: phone || undefined,
      status,
      source,
      notes,
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
    
    // Simulate received message
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

  const mockHistory = [
    { date: "26/12/2024 10:30", event: "Lead criado" },
    { date: "26/12/2024 14:15", event: "Movido de Novo → Qualificado" },
    { date: "26/12/2024 16:45", event: "Notas atualizadas" },
  ];

  return (
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
          <TabsList className="mx-6 mt-4 grid grid-cols-4 bg-muted/50">
            <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Informações</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
              <StickyNote className="h-4 w-4" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1 overflow-auto mt-0">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do lead"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone/WhatsApp</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-value">Valor Estimado (R$)</Label>
                <Input
                  id="edit-value"
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
                <Label htmlFor="edit-source">Origem</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
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
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Etapa</Label>
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
              
              <div className="flex justify-between pt-4">
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
                <Button type="submit" disabled={updateLead.isPending}>
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

          {/* Notes Tab */}
          <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="p-6 flex-1 flex flex-col">
              <Label htmlFor="notes" className="mb-2">Anotações sobre o lead</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione suas observações sobre este lead..."
                className="flex-1 min-h-[200px] resize-none"
              />
              <Button 
                onClick={handleSubmit} 
                disabled={updateLead.isPending}
                className="mt-4 w-full"
              >
                {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Notas
              </Button>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 overflow-auto mt-0">
            <div className="p-6">
              <div className="space-y-4">
                {mockHistory.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{item.event}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-8">
                Histórico completo será implementado em breve
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
