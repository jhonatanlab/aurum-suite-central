import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Users2 } from "lucide-react";

export default function Revendedores() {
  return (
    <AppLayout title="Revendedores">
      <PagePlaceholder
        icon={Users2}
        title="Revendedores"
        description="Gerencie sua rede de revendedores e parceiros comerciais"
      />
    </AppLayout>
  );
}
