import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Zap } from "lucide-react";

export default function Automacoes() {
  return (
    <AppLayout title="Automações">
      <PagePlaceholder
        icon={Zap}
        title="Automações"
        description="Configure automações para processos de vendas, CRM e marketing"
      />
    </AppLayout>
  );
}
