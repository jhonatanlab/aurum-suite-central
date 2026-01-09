import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ResellerDetailHeader } from "@/components/revendedores/ResellerDetailHeader";
import { ResellerDetailTabs } from "@/components/revendedores/ResellerDetailTabs";
import { useResellers } from "@/hooks/useResellers";
import { Loader2 } from "lucide-react";

export default function RevendedorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resellers, isLoading } = useResellers();

  const reseller = resellers.find((r) => r.id === id);

  if (isLoading) {
    return (
      <AppLayout title="Revendedor">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!reseller) {
    return (
      <AppLayout title="Revendedor">
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
          <p className="text-lg font-medium">Revendedor não encontrado</p>
          <button
            onClick={() => navigate("/revendedores")}
            className="mt-4 text-primary hover:underline"
          >
            Voltar para lista
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Revendedor">
      <div className="space-y-6">
        <ResellerDetailHeader reseller={reseller} />
        <ResellerDetailTabs resellerId={reseller.id} />
      </div>
    </AppLayout>
  );
}
