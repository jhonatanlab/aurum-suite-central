import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Settings } from "lucide-react";
import { WhatsAppSettings } from "@/components/configuracoes/WhatsAppSettings";

export default function Configuracoes() {
  return (
    <AppLayout title="Configurações">
      <div className="space-y-6">
        <Tabs defaultValue="whatsapp" className="w-full">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger 
              value="whatsapp" 
              className="data-[state=active]:bg-card data-[state=active]:text-[hsl(var(--gold))]"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger 
              value="geral" 
              className="data-[state=active]:bg-card data-[state=active]:text-[hsl(var(--gold))]"
            >
              <Settings className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppSettings />
          </TabsContent>

          <TabsContent value="geral" className="mt-6">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configurações gerais em breve</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
