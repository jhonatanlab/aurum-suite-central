import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Send, Clock, CheckCircle2, XCircle, Users, MessageSquare, Loader2, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Campaign } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface CampaignRecipient {
  id: string;
  recipient_name: string | null;
  recipient_phone: string;
  recipient_type: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface CampaignDetailPanelProps {
  campaign: Campaign;
  onClose: () => void;
  onUpdate: () => void;
}

export function CampaignDetailPanel({ campaign, onClose, onUpdate }: CampaignDetailPanelProps) {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);

  const fetchRecipients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching recipients:", error);
    } else {
      setRecipients(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecipients();
  }, [campaign.id]);

  const handleExecuteCampaign = async () => {
    setIsExecuting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Você precisa estar logado para executar a campanha");
        return;
      }

      const { data, error } = await supabase.functions.invoke("execute-campaign", {
        body: { campaignId: campaign.id },
      });

      if (error) {
        console.error("Execute campaign error:", error);
        toast.error("Erro ao executar campanha: " + error.message);
        return;
      }

      toast.success(`Campanha iniciada! ${data.totalRecipients} destinatários.`);
      onUpdate();
      
      // Refresh recipients after a delay
      setTimeout(() => {
        fetchRecipients();
      }, 2000);

    } catch (error) {
      console.error("Execute campaign error:", error);
      toast.error("Erro ao executar campanha");
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Enviado</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCampaignStatusBadge = (status: string | null) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Enviada</Badge>;
      case "sending":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Enviando...</Badge>;
      case "scheduled":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Agendada</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelada</Badge>;
      default:
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Rascunho</Badge>;
    }
  };

  const sentCount = recipients.filter(r => r.status === "sent").length;
  const failedCount = recipients.filter(r => r.status === "failed").length;
  const pendingCount = recipients.filter(r => r.status === "pending").length;

  const canExecute = campaign.status === "draft" || campaign.status === "scheduled";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-3xl bg-card border-l border-border shadow-xl animate-in slide-in-from-right duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--gold))]/10">
                <MessageSquare className="h-5 w-5 text-[hsl(var(--gold))]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{campaign.title || "Sem título"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getCampaignStatusBadge(campaign.status)}
                  {campaign.created_at && (
                    <span className="text-xs text-muted-foreground">
                      Criada em {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Action Buttons */}
              {canExecute && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleExecuteCampaign}
                    disabled={isExecuting}
                    className="gold-gradient text-primary-foreground gap-2"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Executar Campanha
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Message Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Mensagem Enviada
                </h3>
                <div className="p-4 bg-muted/50 rounded-xl border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {campaign.message || "Sem mensagem definida"}
                  </p>
                  {campaign.media_url && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        Mídia anexada: {campaign.media_type}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                  <Users className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold text-foreground">{recipients.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-green-400 mb-2" />
                  <p className="text-2xl font-bold text-green-400">{sentCount}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-400 mb-2" />
                  <p className="text-2xl font-bold text-red-400">{failedCount}</p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </div>
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                  <Clock className="h-5 w-5 mx-auto text-yellow-400 mb-2" />
                  <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>

              <Separator />

              {/* Recipients List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Destinatários
                  </h3>
                  <Button variant="ghost" size="sm" onClick={fetchRecipients} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhum destinatário ainda</p>
                    <p className="text-sm">Execute a campanha para enviar mensagens</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients.map((recipient) => (
                          <TableRow key={recipient.id}>
                            <TableCell className="font-medium">
                              {recipient.recipient_name || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {recipient.recipient_phone}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {recipient.recipient_type === "lead" ? "Cliente" : "Revendedor"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(recipient.status)}
                              {recipient.error_message && (
                                <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={recipient.error_message}>
                                  {recipient.error_message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {recipient.sent_at
                                ? format(new Date(recipient.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
