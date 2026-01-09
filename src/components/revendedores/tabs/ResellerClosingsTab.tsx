import { FileText } from "lucide-react";

interface ResellerClosingsTabProps {
  resellerId: string;
}

export function ResellerClosingsTab({ resellerId }: ResellerClosingsTabProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum fechamento registrado</p>
        <p className="text-sm">
          Os fechamentos de consignação aparecerão aqui
        </p>
      </div>
    </div>
  );
}
