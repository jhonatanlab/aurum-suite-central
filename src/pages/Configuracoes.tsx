import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Settings } from "lucide-react";

export default function Configuracoes() {
  return (
    <AppLayout title="Configurações">
      <PagePlaceholder
        icon={Settings}
        title="Configurações do Sistema"
        description="Personalize preferências, integrações e configurações da sua conta."
      />
    </AppLayout>
  );
}
