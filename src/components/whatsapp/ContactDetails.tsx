import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Phone, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Conversation {
  id: string;
  company_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

interface ContactDetailsProps {
  conversation: Conversation | null;
}

export function ContactDetails({ conversation }: ContactDetailsProps) {
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <User className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm text-center">Selecione uma conversa</p>
        <p className="text-xs text-center mt-1">
          Os dados do contato aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Avatar */}
      <div className="flex flex-col items-center py-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-center">
          {conversation.contact_name || "Contato"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {conversation.contact_phone}
        </p>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">
                {conversation.contact_name || "Não informado"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm font-medium">{conversation.contact_phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Última interação</p>
              <p className="text-sm font-medium">
                {conversation.last_message_at
                  ? format(new Date(conversation.last_message_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })
                  : "Sem interação"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
