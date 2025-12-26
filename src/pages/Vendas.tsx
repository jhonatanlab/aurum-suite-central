import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { ShoppingCart } from "lucide-react";

export default function Vendas() {
  return (
    <AppLayout title="Vendas">
      <PagePlaceholder
        icon={ShoppingCart}
        title="Gestão de Vendas"
        description="Acompanhe pedidos, cotações e todo o funil de vendas da sua empresa."
      />
    </AppLayout>
  );
}
