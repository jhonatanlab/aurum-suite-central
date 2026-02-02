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
import { toast } from "sonner";
import { 
  MessageCircle, 
  Server, 
  Wifi, 
  WifiOff, 
  Settings, 
  Loader2, 
  RefreshCw, 
  Plus,
  Building2,
  QrCode,
  Trash2,
  Link,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Company {
  id: string;
  name: string;
}

interface WhatsAppInstance {
  id: string;
  company_id: string;
  instance_id: string | null;
  instance_token: string | null;
  status: string;
  qr_code: string | null;
  last_connected_at: string | null;
  company?: Company;
}

interface N8NSettings {
  id?: string;
  base_url: string;
  create_url: string;
  qr_url: string;
  delete_url: string;
  send_message_url: string;
  secret: string;
}

const DEFAULT_BASE_URL = "https://aurum-n8n.up.railway.app";

export default function AdminWhatsApp() {
  // Settings state
  const [settings, setSettings] = useState<N8NSettings>({
    base_url: DEFAULT_BASE_URL,
    create_url: `${DEFAULT_BASE_URL}/webhook/create-instance`,
    qr_url: `${DEFAULT_BASE_URL}/webhook/generate-qr`,
    delete_url: `${DEFAULT_BASE_URL}/webhook/delete-instance`,
    send_message_url: `${DEFAULT_BASE_URL}/webhook/send-message`,
    secret: ""
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Company and instance state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Action states
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null);

  // QR Code modal
  const [qrCodeModal, setQrCodeModal] = useState<{ open: boolean; qrCode: string | null; companyName: string }>({
    open: false,
    qrCode: null,
    companyName: ""
  });

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
    fetchCompanies();
    fetchInstances();
  }, []);

  // Update URLs when base_url changes
  const handleBaseUrlChange = (newBaseUrl: string) => {
    setSettings(prev => ({
      ...prev,
      base_url: newBaseUrl,
      create_url: `${newBaseUrl}/webhook/create-instance`,
      qr_url: `${newBaseUrl}/webhook/generate-qr`,
      delete_url: `${newBaseUrl}/webhook/delete-instance`,
      send_message_url: `${newBaseUrl}/webhook/send-message`
    }));
  };

  async function fetchSettings() {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          base_url: data.base_url,
          create_url: data.create_url,
          qr_url: data.qr_url,
          delete_url: data.delete_url,
          send_message_url: data.send_message_url || `${data.base_url}/webhook/send-message`,
          secret: data.secret || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoadingSettings(false);
    }
  }

  async function fetchCompanies() {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    setCompanies(data || []);
  }

  async function fetchInstances() {
    setLoadingInstances(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .neq("status", "expired")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch company names
      const companyIds = [...new Set((data || []).map(i => i.company_id))];
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", companyIds);

      const companiesMap = new Map((companiesData || []).map(c => [c.id, c]));

      setInstances((data || []).map(instance => ({
        ...instance,
        company: companiesMap.get(instance.company_id)
      })));
    } catch (error) {
      console.error("Erro ao carregar instâncias:", error);
    } finally {
      setLoadingInstances(false);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      if (settings.id) {
        const { error } = await supabase
          .from("whatsapp_settings")
          .update({
            base_url: settings.base_url,
            create_url: settings.create_url,
            qr_url: settings.qr_url,
            delete_url: settings.delete_url,
            send_message_url: settings.send_message_url,
            secret: settings.secret || null
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("whatsapp_settings")
          .insert({
            base_url: settings.base_url,
            create_url: settings.create_url,
            qr_url: settings.qr_url,
            delete_url: settings.delete_url,
            send_message_url: settings.send_message_url,
            secret: settings.secret || null
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingSettings(false);
    }
  }

  // Get selected company instance
  const selectedCompanyInstance = selectedCompanyId 
    ? instances.find(i => i.company_id === selectedCompanyId)
    : null;

  async function handleCreateInstance() {
    if (!selectedCompanyId) return;
    setCreatingInstance(true);
    
    try {
      // Use Edge Function to proxy request to n8n
      const { data, error } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          action: "create-instance",
          endpoint_url: settings.create_url,
          payload: { company_id: selectedCompanyId }
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erro ao criar instância");
      }

      if (!data?.success) {
        console.error("n8n error:", data);
        throw new Error(data?.error || "Erro ao criar instância no n8n");
      }

      const result = data.data || {};
      console.log("n8n response:", result);

      // Save to Supabase
      const { error: dbError } = await supabase
        .from("whatsapp_instances")
        .insert({
          company_id: selectedCompanyId,
          instance_id: result.instance_id || null,
          instance_token: result.instance_token || null,
          status: result.status || "disconnected"
        });

      if (dbError) throw dbError;

      toast.success("Instância criada com sucesso!");
      fetchInstances();
      setSelectedCompanyId("");
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar instância");
    } finally {
      setCreatingInstance(false);
    }
  }

  async function handleGenerateQR(instanceId: string) {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance?.instance_id) {
      toast.error("ID da instância não encontrado");
      return;
    }

    setGeneratingQR(instanceId);
    
    try {
      // Use Edge Function to proxy request to n8n
      const { data, error } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          action: "generate-qr",
          endpoint_url: settings.qr_url,
          payload: { 
            instance_id: instance.instance_id,
            company_id: instance.company_id
          }
        }
      });

      if (error) throw new Error(error.message || "Erro ao gerar QR Code");
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar QR Code no n8n");

      const result = data.data || {};

      if (result.qr_code) {
        // Save QR code to Supabase
        await supabase
          .from("whatsapp_instances")
          .update({ qr_code: result.qr_code, status: "qrcode" })
          .eq("id", instanceId);

        setQrCodeModal({
          open: true,
          qrCode: result.qr_code,
          companyName: instance.company?.name || "Empresa"
        });

        fetchInstances();
      }
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar QR Code");
    } finally {
      setGeneratingQR(null);
    }
  }

  async function handleDeleteInstance(instanceId: string) {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance?.instance_id) {
      // Just delete from Supabase if no instance_id
      await supabase.from("whatsapp_instances").delete().eq("id", instanceId);
      toast.success("Instância removida!");
      fetchInstances();
      return;
    }

    setDeletingInstance(instanceId);
    
    try {
      // Use Edge Function to proxy request to n8n
      const { data, error } = await supabase.functions.invoke("n8n-proxy", {
        body: {
          action: "delete-instance",
          endpoint_url: settings.delete_url,
          payload: { 
            instance_id: instance.instance_id,
            company_id: instance.company_id
          }
        }
      });

      if (error) throw new Error(error.message || "Erro ao deletar instância");
      if (!data?.success) throw new Error(data?.error || "Erro ao deletar instância no n8n");

      // Delete from Supabase
      await supabase.from("whatsapp_instances").delete().eq("id", instanceId);

      toast.success("Instância removida com sucesso!");
      fetchInstances();
    } catch (error) {
      console.error("Erro ao deletar instância:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao deletar instância");
    } finally {
      setDeletingInstance(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Conectado</Badge>;
      case "connecting":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Conectando</Badge>;
      case "qrcode":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">QR Pronto</Badge>;
      default:
        return <Badge variant="outline">Desconectado</Badge>;
    }
  };

  // Companies without active instance
  const companiesWithoutInstance = companies.filter(
    c => !instances.some(i => i.company_id === c.id)
  );

  return (
    <AdminLayout title="WhatsApp (n8n)">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">WhatsApp - n8n Webhooks</h2>
          <p className="text-muted-foreground">
            Configure os endpoints do n8n e gerencie as instâncias WhatsApp das empresas.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 1. Configuração Global */}
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Globe className="h-5 w-5 text-primary" />
                Conexão com n8n
              </CardTitle>
              <CardDescription>
                Configure os endpoints de webhook do n8n para gerenciamento de instâncias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="base-url">N8N Base URL</Label>
                    <Input
                      id="base-url"
                      placeholder="https://seu-n8n.railway.app"
                      value={settings.base_url}
                      onChange={(e) => handleBaseUrlChange(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secret">Webhook Secret (opcional)</Label>
                    <Input
                      id="secret"
                      type="password"
                      placeholder="••••••••••••"
                      value={settings.secret}
                      onChange={(e) => setSettings(prev => ({ ...prev, secret: e.target.value }))}
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-url" className="flex items-center gap-2">
                      <Link className="h-3 w-3" />
                      Create Instance Endpoint
                    </Label>
                    <Input
                      id="create-url"
                      value={settings.create_url}
                      onChange={(e) => setSettings(prev => ({ ...prev, create_url: e.target.value }))}
                      className="bg-background border-border text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qr-url" className="flex items-center gap-2">
                      <Link className="h-3 w-3" />
                      Generate QR Endpoint
                    </Label>
                    <Input
                      id="qr-url"
                      value={settings.qr_url}
                      onChange={(e) => setSettings(prev => ({ ...prev, qr_url: e.target.value }))}
                      className="bg-background border-border text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delete-url" className="flex items-center gap-2">
                      <Link className="h-3 w-3" />
                      Delete Instance Endpoint
                    </Label>
                    <Input
                      id="delete-url"
                      value={settings.delete_url}
                      onChange={(e) => setSettings(prev => ({ ...prev, delete_url: e.target.value }))}
                      className="bg-background border-border text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="send-message-url" className="flex items-center gap-2">
                      <MessageCircle className="h-3 w-3" />
                      Send Message Endpoint
                    </Label>
                    <Input
                      id="send-message-url"
                      value={settings.send_message_url}
                      onChange={(e) => setSettings(prev => ({ ...prev, send_message_url: e.target.value }))}
                      className="bg-background border-border text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Salvar Configuração
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Controle por Empresa */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Instância por Empresa
              </CardTitle>
              <CardDescription>
                Selecione uma empresa para gerenciar sua instância WhatsApp
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
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCompanyId && (
                <div className="p-4 rounded-lg bg-background border border-border space-y-3">
                  {selectedCompanyInstance ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        {getStatusBadge(selectedCompanyInstance.status)}
                      </div>
                      {selectedCompanyInstance.instance_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Instance ID:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {selectedCompanyInstance.instance_id}
                          </code>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                          onClick={() => handleGenerateQR(selectedCompanyInstance.id)}
                          disabled={generatingQR === selectedCompanyInstance.id}
                        >
                          {generatingQR === selectedCompanyInstance.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          Gerar QR Code
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={deletingInstance === selectedCompanyInstance.id}
                            >
                              {deletingInstance === selectedCompanyInstance.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Apagar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Apagar instância?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá remover a instância WhatsApp desta empresa. 
                                A conexão será perdida e será necessário criar uma nova instância.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-background">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteInstance(selectedCompanyInstance.id)}
                              >
                                Apagar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <WifiOff className="h-4 w-4" />
                        <span className="text-sm">Nenhuma instância encontrada</span>
                      </div>
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleCreateInstance}
                        disabled={creatingInstance}
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
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status do Servidor */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Server className="h-5 w-5 text-primary" />
                Status da Configuração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  {settings.base_url ? (
                    <Wifi className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">n8n Webhooks</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {settings.base_url || "Não configurado"}
                    </p>
                  </div>
                </div>
                <Badge variant={settings.id ? "default" : "outline"}>
                  {settings.id ? "Configurado" : "Pendente"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Lista Geral - Instâncias Ativas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Instâncias Ativas
                </CardTitle>
                <CardDescription>
                  Lista de todas as instâncias WhatsApp cadastradas
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchInstances}>
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
                <p className="text-sm mt-1">Selecione uma empresa acima e crie uma instância.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Empresa</TableHead>
                    <TableHead className="text-muted-foreground">Instance ID</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Última Conexão</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((instance) => (
                    <TableRow key={instance.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {instance.company?.name || "Empresa não encontrada"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {instance.instance_id || "-"}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {instance.last_connected_at
                          ? format(new Date(instance.last_connected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateQR(instance.id)}
                            disabled={generatingQR === instance.id}
                            className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                          >
                            {generatingQR === instance.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <QrCode className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                disabled={deletingInstance === instance.id}
                              >
                                {deletingInstance === instance.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Apagar instância?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover a instância WhatsApp de {instance.company?.name || "esta empresa"}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-background">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteInstance(instance.id)}
                                >
                                  Apagar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                QR Code - {qrCodeModal.companyName}
              </DialogTitle>
              <DialogDescription>
                Escaneie o código QR com o WhatsApp para conectar
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4">
              {qrCodeModal.qrCode ? (
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCodeModal.qrCode.startsWith("data:") 
                      ? qrCodeModal.qrCode 
                      : `data:image/png;base64,${qrCodeModal.qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
