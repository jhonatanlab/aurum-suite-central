import { useResellerHistory, ResellerHistory } from "@/hooks/useResellers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, UserPlus, Pencil, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

interface ResellerHistoryTabProps {
  resellerId: string;
}

const actionIcons: Record<string, typeof History> = {
  created: UserPlus,
  updated: Pencil,
  activated: ToggleRight,
  deactivated: ToggleLeft,
};

const actionColors: Record<string, string> = {
  created: "text-green-400 bg-green-500/20",
  updated: "text-blue-400 bg-blue-500/20",
  activated: "text-green-400 bg-green-500/20",
  deactivated: "text-orange-400 bg-orange-500/20",
};

export function ResellerHistoryTab({ resellerId }: ResellerHistoryTabProps) {
  const { data: history, isLoading: isLoadingHistory } = useResellerHistory(resellerId);

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum histórico registrado</p>
          <p className="text-sm">
            As ações do revendedor serão registradas aqui
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="divide-y divide-border">
        {history.map((item) => {
          const Icon = actionIcons[item.action] || History;
          const colorClass = actionColors[item.action] || "text-muted-foreground bg-muted";

          return (
            <div
              key={item.id}
              className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(item.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
