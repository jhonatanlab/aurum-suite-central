import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { MessageCircle } from "lucide-react";

export default function Whatsapp() {
  return (
    <AppLayout title="Whatsapp">
      <PagePlaceholder
        icon={MessageCircle}
        title="Integração Whatsapp"
        description="Automatize mensagens, gerencie conversas e conecte-se com seus clientes."
      />
    </AppLayout>
  );
}
