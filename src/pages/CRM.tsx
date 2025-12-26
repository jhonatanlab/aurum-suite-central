import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Settings, MessageCircle, Phone } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  value: number;
}

interface Column {
  id: string;
  title: string;
  leads: Lead[];
}

const mockColumns: Column[] = [
  {
    id: "novo",
    title: "Novo Lead",
    leads: [
      { id: "0001", name: "Maria Silva", value: 2500 },
      { id: "0002", name: "João Santos", value: 4800 },
      { id: "0003", name: "Ana Costa", value: 1200 },
    ],
  },
  {
    id: "qualificado",
    title: "Qualificado",
    leads: [
      { id: "0004", name: "Pedro Oliveira", value: 7500 },
      { id: "0005", name: "Carla Mendes", value: 3200 },
    ],
  },
  {
    id: "proposta",
    title: "Proposta Enviada",
    leads: [
      { id: "0006", name: "Lucas Ferreira", value: 12000 },
      { id: "0007", name: "Fernanda Lima", value: 5600 },
      { id: "0008", name: "Ricardo Alves", value: 8900 },
    ],
  },
  {
    id: "negociacao",
    title: "Negociação",
    leads: [
      { id: "0009", name: "Juliana Rocha", value: 15000 },
    ],
  },
];

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card className="p-4 bg-card border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {lead.name}
          </h4>
          <span className="text-xs text-muted-foreground">#{lead.id}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <MessageCircle className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm font-semibold text-primary">
          R$ {lead.value.toLocaleString("pt-BR")}
        </span>
      </div>
    </Card>
  );
}

function KanbanColumn({ column }: { column: Column }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{column.title}</h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {column.leads.length}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {column.leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export default function CRM() {
  return (
    <AppLayout title="CRM">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              className="pl-10 bg-card border-border/50 focus:border-primary"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Editar Pipeline
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {mockColumns.map((column) => (
              <KanbanColumn key={column.id} column={column} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
