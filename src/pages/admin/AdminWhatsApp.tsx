import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { 
  MessageCircle, 
  Server, 
  Wifi, 
  WifiOff, 
  Settings, 
  Loader2, 
  RefreshCw, 
  Unplug,
  Plus,
  Building2,
  Phone,
  Eye,
  EyeOff,
  QrCode
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Company {
  id: string;
  name: string;
}

export default function AdminWhatsApp() {
  const { settings, setSettings, loading: loadingSettings, saving, saveSettings } = useAdminSettings();
  const { instances, loading: loadingInstances, disconnectInstance, createInstance, getQRCode, checkStatus, refetch } = useWhatsAppInstances();
  const [showToken, setShowToken] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [qrCodeModal, setQrCodeModal] = useState<{ open: boolean; qrCode: string | null; companyName: string }>({
    open: false,
    qrCode: null,
    companyName: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  }

  const handleSaveSettings = () => {
    saveSettings(settings);
  };

  const handleCreateInstance = async () => {
    if (!selectedCompanyId) return;
    setCreatingInstance(true);
    await createInstance(selectedCompanyId);
    setSelectedCompanyId('');
    setCreatingInstance(false);
  };

  const handleCheckStatus = async (instanceId: string) => {
    setCheckingStatus(instanceId);
    await checkStatus(instanceId);
    setCheckingStatus(null);
  };

  const handleGenerateQR = async (instanceId: string) => {
    setGeneratingQR(instanceId);
    const result = await getQRCode(instanceId);
    if (result?.qrcode) {
      const instance = instances.find(i => i.id === instanceId);
      setQrCodeModal({
        open: true,
        qrCode: result.qrcode,
        companyName: instance?.company?.name || 'Empresa'
      });
    }
    setGeneratingQR(null);
  };

  const companiesWithoutInstance = companies.filter(
    c => !instances.some(i => i.company_id === c.id)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Conectando</Badge>;
      case 'qr_ready':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">QR Pronto</Badge>;
      default:
        return <Badge variant="outline">Desconectado</Badge>;
    }
  };

  return (
    <AdminLayout title="WhatsApp (Uazapi)">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">WhatsApp - Uazapi</h2>
          <p className="text-muted-foreground">
            Configure a integração global e gerencie as instâncias das empresas.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configurações Globais */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5 text-red-500" />
                Configurações Globais
              </CardTitle>
              <CardDescription>
                Token master e endpoint base para todas as instâncias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="api-url">Endpoint Base</Label>
                    <Input
                      id="api-url"
                      placeholder="https://api.uazapi.com"
                      value={settings.uazapi_endpoint}
                      onChange={(e) => setSettings({ ...settings, uazapi_endpoint: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-token">Token Master</Label>
                    <div className="relative">
                      <Input
                        id="api-token"
                        type={showToken ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={settings.uazapi_token}
                        onChange={(e) => setSettings({ ...settings, uazapi_token: e.target.value })}
                        className="bg-background border-border pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://seu-dominio.com/webhook"
                      value={settings.uazapi_webhook_url}
                      onChange={(e) => setSettings({ ...settings, uazapi_webhook_url: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleSaveSettings}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Configurações'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status e Nova Instância */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Server className="h-5 w-5 text-red-500" />
                  Status do Servidor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    {settings.uazapi_endpoint && settings.uazapi_token ? (
                      <Wifi className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">API Uazapi</p>
                      <p className="text-sm text-muted-foreground">
                        {settings.uazapi_endpoint || 'Não configurado'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={settings.uazapi_endpoint && settings.uazapi_token ? "default" : "outline"}>
                    {settings.uazapi_endpoint && settings.uazapi_token ? 'Configurado' : 'Pendente'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5 text-red-500" />
                  Nova Instância
                </CardTitle>
                <CardDescription>
                  Criar instância para uma empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {companiesWithoutInstance.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Todas as empresas já têm instância
                        </SelectItem>
                      ) : (
                        companiesWithoutInstance.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCreateInstance}
                  disabled={!selectedCompanyId || creatingInstance}
                >
                  {creatingInstance ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Instância
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de Instâncias */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MessageCircle className="h-5 w-5 text-red-500" />
                  Instâncias das Empresas
                </CardTitle>
                <CardDescription>
                  Gerencie as instâncias WhatsApp de cada empresa
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInstances ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma instância WhatsApp cadastrada.</p>
                <p className="text-sm mt-1">Crie uma instância para uma empresa acima.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Empresa
                      </div>
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Número
                      </div>
                    </TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Última Conexão</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((instance) => (
                    <TableRow key={instance.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {instance.company?.name || 'Empresa não encontrada'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {instance.phone_number || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {instance.last_connected_at 
                          ? format(new Date(instance.last_connected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                        <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botão Gerar QR para instâncias desconectadas */}
                          {instance.status !== 'connected' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleGenerateQR(instance.id)}
                              disabled={generatingQR === instance.id}
                              className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                              title="Gerar QR Code"
                            >
                              {generatingQR === instance.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <QrCode className="h-4 w-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">QR Code</span>
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCheckStatus(instance.id)}
                            disabled={checkingStatus === instance.id}
                            title="Verificar Status"
                          >
                            <RefreshCw className={`h-4 w-4 ${checkingStatus === instance.id ? 'animate-spin' : ''}`} />
                          </Button>
                          {instance.status === 'connected' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  title="Desconectar"
                                >
                                  <Unplug className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">
                                    Desconectar instância?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso irá desconectar a instância WhatsApp da empresa{' '}
                                    <strong>{instance.company?.name}</strong>. A empresa precisará
                                    escanear o QR Code novamente para reconectar.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-background border-border">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => disconnectInstance(instance.id)}
                                  >
                                    Desconectar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* QR Code Modal */}
        <Dialog open={qrCodeModal.open} onOpenChange={(open) => setQrCodeModal(prev => ({ ...prev, open }))}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <QrCode className="h-5 w-5 text-primary" />
                QR Code - {qrCodeModal.companyName}
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code abaixo com o WhatsApp da empresa para conectar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4">
              {qrCodeModal.qrCode ? (
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={qrCodeModal.qrCode.startsWith('data:') 
                      ? qrCodeModal.qrCode 
                      : `data:image/png;base64,${qrCodeModal.qrCode}`
                    } 
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                O QR Code expira em alguns minutos. Se expirar, clique novamente em "Gerar QR Code".
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}