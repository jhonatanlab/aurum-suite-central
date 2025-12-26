import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { UserCircle } from "lucide-react";

export default function Equipe() {
  return (
    <AppLayout title="Equipe">
      <PagePlaceholder
        icon={UserCircle}
        title="Gestão de Equipe"
        description="Gerencie colaboradores, permissões e acompanhe o desempenho da sua equipe."
      />
    </AppLayout>
  );
}
