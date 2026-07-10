import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MoveRight, Phone, Mail, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { ContactsExportMenu } from "./ContactsExportMenu";

interface Lead {
  id: string;
  name: string;
  value: number | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  product_id?: string | null;
  product_value?: number | null;
  created_at: string | null;
}

interface Stage {
  id: string;
  name: string;
  position: number;
}

interface ContactsTabProps {
  leads: Lead[];
  stages: Stage[];
  onMoveToStage: (leadId: string, stageId: string) => void;
  onLeadClick: (lead: Lead) => void;
}

export function ContactsTab({ leads, stages, onMoveToStage, onLeadClick }: ContactsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [moveStageId, setMoveStageId] = useState<Record<string, string>>({});
  const { getProductById } = useProducts();

  const filteredLeads = leads.filter((lead) => {
    const term = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      lead.phone?.includes(term)
    );
  });

  const handleMoveClick = (leadId: string) => {
    const stageId = moveStageId[leadId];
    if (stageId) {
      onMoveToStage(leadId, stageId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-background border-border/50"
        />
      </div>

      {/* Contacts List */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum contato encontrado</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const product = getProductById(lead.product_id || null);
            const displayValue = lead.product_value ?? lead.value ?? 0;
            const stageName = stages.find((s) => s.id === lead.status)?.name;

            return (
              <Card
                key={lead.id}
                className="p-4 bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => onLeadClick(lead)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">{lead.name}</h4>
                      {stageName && (
                        <Badge variant="outline" className="text-xs">
                          {stageName}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                    </div>

                    {product && (
                      <div className="flex items-center gap-1 text-sm text-primary mt-1">
                        <Package className="h-3 w-3" />
                        {product.name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      R$ {displayValue.toLocaleString("pt-BR")}
                    </span>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={moveStageId[lead.id] || ""}
                        onValueChange={(value) =>
                          setMoveStageId((prev) => ({ ...prev, [lead.id]: value }))
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Mover para..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={!moveStageId[lead.id]}
                        onClick={() => handleMoveClick(lead.id)}
                      >
                        <MoveRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
