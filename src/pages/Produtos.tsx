import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Package } from "lucide-react";

export default function Produtos() {
  return (
    <AppLayout title="Produtos">
      <PagePlaceholder
        icon={Package}
        title="Catálogo de Produtos"
        description="Gerencie seu catálogo, estoque e preços dos seus produtos e serviços."
      />
    </AppLayout>
  );
}
