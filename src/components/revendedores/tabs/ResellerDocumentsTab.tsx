import { Files } from "lucide-react";

interface ResellerDocumentsTabProps {
  resellerId: string;
}

export function ResellerDocumentsTab({ resellerId }: ResellerDocumentsTabProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Files className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum documento anexado</p>
        <p className="text-sm">
          Os documentos do revendedor aparecerão aqui
        </p>
      </div>
    </div>
  );
}
