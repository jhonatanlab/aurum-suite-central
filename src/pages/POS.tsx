import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Monitor } from "lucide-react";

export default function POS() {
  return (
    <AppLayout title="POS">
      <PagePlaceholder
        icon={Monitor}
        title="Ponto de Venda"
        description="Sistema de caixa integrado para vendas presenciais rápidas e eficientes."
      />
    </AppLayout>
  );
}
