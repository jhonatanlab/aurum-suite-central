import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResellerConsignedTab } from "./tabs/ResellerConsignedTab";
import { ResellerClosingsTab } from "./tabs/ResellerClosingsTab";
import { ResellerHistoryTab } from "./tabs/ResellerHistoryTab";
import { ResellerDocumentsTab } from "./tabs/ResellerDocumentsTab";
import { ResellerPaymentsTab } from "./tabs/ResellerPaymentsTab";
import { ResellerStatementTab } from "./tabs/ResellerStatementTab";
import { Package, FileText, History, Files, Wallet, Receipt } from "lucide-react";

interface ResellerDetailTabsProps {
  resellerId: string;
  resellerName: string;
}

export function ResellerDetailTabs({ resellerId, resellerName }: ResellerDetailTabsProps) {
  return (
    <Tabs defaultValue="consigned" className="space-y-6">
      <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
        <TabsTrigger
          value="consigned"
          className="gap-2 data-[state=active]:bg-background"
        >
          <Package className="h-4 w-4" />
          Peças Consignadas
        </TabsTrigger>
        <TabsTrigger
          value="closings"
          className="gap-2 data-[state=active]:bg-background"
        >
          <FileText className="h-4 w-4" />
          Fechamentos
        </TabsTrigger>
        <TabsTrigger
          value="payments"
          className="gap-2 data-[state=active]:bg-background"
        >
          <Wallet className="h-4 w-4" />
          Pagamentos
        </TabsTrigger>
        <TabsTrigger
          value="statement"
          className="gap-2 data-[state=active]:bg-background"
        >
          <Receipt className="h-4 w-4" />
          Extrato
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="gap-2 data-[state=active]:bg-background"
        >
          <History className="h-4 w-4" />
          Histórico
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="gap-2 data-[state=active]:bg-background"
        >
          <Files className="h-4 w-4" />
          Documentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consigned">
        <ResellerConsignedTab resellerId={resellerId} />
      </TabsContent>

      <TabsContent value="closings">
        <ResellerClosingsTab resellerId={resellerId} />
      </TabsContent>

      <TabsContent value="payments">
        <ResellerPaymentsTab resellerId={resellerId} />
      </TabsContent>

      <TabsContent value="statement">
        <ResellerStatementTab resellerId={resellerId} resellerName={resellerName} />
      </TabsContent>

      <TabsContent value="history">
        <ResellerHistoryTab resellerId={resellerId} />
      </TabsContent>

      <TabsContent value="documents">
        <ResellerDocumentsTab resellerId={resellerId} />
      </TabsContent>
    </Tabs>
  );
}
