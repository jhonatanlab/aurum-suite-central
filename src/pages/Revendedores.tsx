import { AppLayout } from "@/components/layout/AppLayout";
import { ResellersList } from "@/components/revendedores/ResellersList";

export default function Revendedores() {
  return (
    <AppLayout title="Revendedores">
      <ResellersList />
    </AppLayout>
  );
}
