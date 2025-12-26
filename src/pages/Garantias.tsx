import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { ShieldCheck } from "lucide-react";

export default function Garantias() {
  return (
    <AppLayout title="Garantias & Retornos">
      <PagePlaceholder
        icon={ShieldCheck}
        title="Garantias & Retornos"
        description="Gerencie garantias de produtos e processos de devolução"
      />
    </AppLayout>
  );
}
