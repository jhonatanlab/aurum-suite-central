import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Megaphone } from "lucide-react";

export default function Campanhas() {
  return (
    <AppLayout title="Campanhas">
      <PagePlaceholder
        icon={Megaphone}
        title="Campanhas de Marketing"
        description="Crie e gerencie campanhas de marketing para alcançar seus clientes."
      />
    </AppLayout>
  );
}
