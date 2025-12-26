import { AppLayout } from "@/components/layout/AppLayout";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { Wallet } from "lucide-react";

export default function Financeiro() {
  return (
    <AppLayout title="Financeiro">
      <PagePlaceholder
        icon={Wallet}
        title="Financeiro"
        description="Controle financeiro, fluxo de caixa e relatórios"
      />
    </AppLayout>
  );
}
