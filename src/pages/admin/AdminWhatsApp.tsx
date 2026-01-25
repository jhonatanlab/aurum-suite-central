import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Server, Wifi, WifiOff, Settings } from "lucide-react";

export default function AdminWhatsApp() {
  return (
    <AdminLayout title="WhatsApp (Uazapi)">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">WhatsApp - Uazapi</h2>
          <p className="text-muted-foreground">
            Configure a integração global com a API Uazapi.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5 text-red-500" />
                Configurações da API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">URL da API</Label>
                <Input
                  id="api-url"
                  placeholder="https://api.uazapi.com"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-token">Token Global</Label>
                <Input
                  id="api-token"
                  type="password"
                  placeholder="••••••••••••"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://seu-dominio.com/webhook"
                  className="bg-background border-border"
                />
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Server className="h-5 w-5 text-red-500" />
                Status do Servidor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">API Uazapi</p>
                    <p className="text-sm text-muted-foreground">Não configurado</p>
                  </div>
                </div>
                <Badge variant="outline">Offline</Badge>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">
                  Configure as credenciais da API para habilitar as funcionalidades de WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageCircle className="h-5 w-5 text-red-500" />
              Instâncias das Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma instância WhatsApp ativa no momento.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
