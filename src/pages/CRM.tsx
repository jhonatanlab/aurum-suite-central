import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Users } from "lucide-react";

export default function CRM() {
  return (
    <AppLayout title="CRM">
      <PagePlaceholder
        icon={Users}
        title="Gestão de Relacionamento"
        description="Gerencie seus clientes, leads e oportunidades de negócio em um só lugar."
      />
    </AppLayout>
  );
}
