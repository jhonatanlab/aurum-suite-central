import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MoreHorizontal, 
  Send, 
  Clock, 
  FileText, 
  XCircle,
  Users,
  Edit,
  Trash2,
  Play
} from "lucide-react";
import { Campaign } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface CampaignsListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onEdit: (campaign: Campaign) => void;
  onCancel: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { 
    label: "Rascunho", 
    variant: "secondary",
    icon: <FileText className="h-3 w-3" />
  },
  scheduled: { 
    label: "Agendada", 
    variant: "outline",
    icon: <Clock className="h-3 w-3" />
  },
  sent: { 
    label: "Enviada", 
    variant: "default",
    icon: <Send className="h-3 w-3" />
  },
  cancelled: { 
    label: "Cancelada", 
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />
  },
};

export function CampaignsList({ campaigns, isLoading, onEdit, onCancel, onDelete }: CampaignsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Send className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          Nenhuma campanha criada
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Crie sua primeira campanha para alcançar seus clientes via WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Nome</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Criada em</TableHead>
            <TableHead className="text-muted-foreground">Agendada</TableHead>
            <TableHead className="text-muted-foreground text-center">Destinatários</TableHead>
            <TableHead className="text-muted-foreground text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status || "draft"];
            return (
              <TableRow 
                key={campaign.id} 
                className="border-border hover:bg-muted/50 cursor-pointer"
                onClick={() => onEdit(campaign)}
              >
                <TableCell className="font-medium text-foreground">
                  {campaign.title || "Sem título"}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    {status.icon}
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {campaign.created_at 
                    ? format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {campaign.scheduled_at 
                    ? format(new Date(campaign.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{campaign.total_recipients || 0}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onEdit(campaign); }}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {campaign.status === "draft" && (
                        <DropdownMenuItem className="cursor-pointer">
                          <Play className="h-4 w-4 mr-2" />
                          Enviar agora
                        </DropdownMenuItem>
                      )}
                      {(campaign.status === "scheduled" || campaign.status === "draft") && (
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onCancel(campaign.id); }}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "draft" && (
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onDelete(campaign.id); }}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
