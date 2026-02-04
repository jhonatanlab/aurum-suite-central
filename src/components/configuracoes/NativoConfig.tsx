import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode, RefreshCw, Smartphone, Wifi, WifiOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export function NativoConfig() {
  const { company } = useCompany();
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resetting, setResetting] = useState(false);

  // QR Code modal state
  const [qrCodeModal, setQrCodeModal] = useState<{ open: boolean; qrCode: string | null }>({
    open: false,
    qrCode: null
  });

  useEffect(() => {
    if (company?.id) {
      fetchInstance();
    }
  }, [company?.id]);

  // Poll for status when QR modal is open
  useEffect(() => {
    if (qrCodeModal.open && instance?.id) {
      const interval = setInterval(() => {
        checkStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [qrCodeModal.open, instance?.id]);

  async function fetchInstance() {
    if (!company?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      setInstance(data);
    } catch (err) {
      console.error('Error fetching instance:', err);
    } finally {
      setLoading(false);
    }
  }

  async function getN8nSettings() {
    const { data } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    return data;
  }

  async function handleConnect() {
    if (!company?.id) return;
    
    setConnecting(true);
    try {
      // Check if instance already exists
      const { data: existingInstance } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      // If instance already exists with instance_id, it's ready
      if (existingInstance?.instance_id) {
        setInstance(existingInstance);
        toast.success('Instância encontrada! Clique em "Gerar QR Code" para conectar.');
        return;
      }

      // No instance exists, create new one
      const settings = await getN8nSettings();
      if (!settings?.create_url) {
        throw new Error("Configurações do n8n não encontradas. Contate o administrador.");
      }

      const { data, error } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          action: "create-instance",
          endpoint_url: settings.create_url,
          payload: { company_id: company.id }
        }
      });

      if (error) throw new Error(error.message || 'Erro ao criar instância');
      if (!data?.success) {
        const detailsMsg = data?.details?.message;
        throw new Error(detailsMsg || data?.error || 'Erro ao criar instância no servidor');
      }

      toast.success('Instância criada! Clique em "Gerar QR Code" para conectar.');
      
      // Wait for webhook to save the instance
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchInstance();
    } catch (err: any) {
      console.error('Error connecting:', err);
      toast.error(err.message || 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }

  async function handleGenerateQR() {
    if (!instance?.instance_id) {
      toast.error("ID da instância não encontrado. Tente reconectar.");
      return;
    }

    setGeneratingQR(true);
    try {
      const settings = await getN8nSettings();
      if (!settings?.qr_url) {
        throw new Error("Configurações do n8n não encontradas. Contate o administrador.");
      }

      const { data, error } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          action: "generate-qr",
          endpoint_url: settings.qr_url,
          payload: { 
            instance_id: instance.instance_id,
            company_id: company?.id
          }
        }
      });

      if (error) throw new Error(error.message || 'Erro ao gerar QR Code');
      if (!data?.success) {
        const detailsMsg = data?.details?.message;
        throw new Error(detailsMsg || data?.error || 'Erro ao gerar QR Code no servidor');
      }

      const result = data.data || {};

      // Check if status is 'open' - means already connected
      if (result.status === 'open' || result.status === 'connected') {
        await supabase
          .from("whatsapp_instances")
          .update({ status: "connected", qr_code: null })
          .eq("id", instance.id);

        setInstance((prev: any) => ({ ...prev, status: 'connected', qr_code: null }));
        setQrCodeModal({ open: false, qrCode: null });
        toast.success('WhatsApp já está conectado!');
        return;
      }

      if (result.qr_code) {
        // Save QR code to Supabase
        await supabase
          .from("whatsapp_instances")
          .update({ qr_code: result.qr_code, status: "qrcode" })
          .eq("id", instance.id);

        // Open modal with QR code
        setQrCodeModal({
          open: true,
          qrCode: result.qr_code
        });

        setInstance((prev: any) => ({ ...prev, qr_code: result.qr_code, status: 'qrcode' }));
      } else {
        throw new Error("QR Code não retornado pelo servidor");
      }
    } catch (err: any) {
      console.error('Error generating QR:', err);
      toast.error(err.message || 'Erro ao gerar QR Code');
    } finally {
      setGeneratingQR(false);
    }
  }

  async function checkStatus() {
    if (!instance?.id || checkingStatus) return;
    
    setCheckingStatus(true);
    try {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('id', instance.id)
        .single();

      if (data?.status === 'connected' && instance.status !== 'connected') {
        toast.success('WhatsApp conectado com sucesso!');
        setInstance(data);
        setQrCodeModal({ open: false, qrCode: null });
      } else if (data?.status !== instance.status) {
        setInstance(data);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleDisconnect() {
    if (!instance?.id) return;
    
    setConnecting(true);
    try {
      const settings = await getN8nSettings();
      
      if (instance.instance_id && settings?.delete_url) {
        await supabase.functions.invoke('n8n-proxy', {
          body: {
            action: "delete-instance",
            endpoint_url: settings.delete_url,
            payload: { 
              instance_id: instance.instance_id,
              company_id: company?.id
            }
          }
        });
      }

      await supabase.from('whatsapp_instances').delete().eq('id', instance.id);
      
      toast.success('WhatsApp desconectado');
      setInstance(null);
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      toast.error('Erro ao desconectar');
    } finally {
      setConnecting(false);
    }
  }

  async function handleReset() {
    if (!instance?.id) return;
    
    setResetting(true);
    try {
      await supabase
        .from('whatsapp_instances')
        .update({
          instance_id: null,
          instance_token: null,
          qr_code: null,
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', instance.id);
      
      toast.success('Instância resetada. Você pode conectar novamente.');
      await fetchInstance();
    } catch (err: any) {
      console.error('Error resetting:', err);
      toast.error(err.message || 'Erro ao resetar instância');
    } finally {
      setResetting(false);
    }
  }

  const isConnected = instance?.status === 'connected';
  const hasInstance = instance?.instance_id;

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-[hsl(var(--gold))]" />
            Configuração Nativo
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp escaneando o QR Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-emerald-500" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">Status da Conexão</p>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? `WhatsApp conectado${instance?.phone_number ? ` (${instance.phone_number})` : ''}`
                    : hasInstance
                      ? "Instância pronta. Gere o QR Code para conectar."
                      : "Aguardando conexão"}
                </p>
              </div>
            </div>
            <Badge 
              variant={isConnected ? "default" : "secondary"} 
              className={isConnected ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : ""}
            >
              {isConnected ? "Conectado" : hasInstance ? "Pronto" : "Desconectado"}
            </Badge>
          </div>

          {/* Actions */}
          {!isConnected && (
            <div className="space-y-3">
              {!hasInstance ? (
                <Button 
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full gold-gradient text-primary-foreground"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Criando instância...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Conectar WhatsApp
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleGenerateQR}
                  disabled={generatingQR}
                  className="w-full gold-gradient text-primary-foreground"
                >
                  {generatingQR ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code
                    </>
                  )}
                </Button>
              )}

              {hasInstance && (
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={resetting}
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resetar Instância
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Disconnect Button */}
          {isConnected && (
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              disabled={connecting}
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <WifiOff className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={qrCodeModal.open} onOpenChange={(open) => setQrCodeModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[hsl(var(--gold))]" />
              Escaneie o QR Code
            </DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular, vá em Configurações &gt; Aparelhos conectados e escaneie o código abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeModal.qrCode ? (
              <div className="p-4 bg-white rounded-xl">
                <img 
                  src={qrCodeModal.qrCode.startsWith('data:') ? qrCodeModal.qrCode : `data:image/png;base64,${qrCodeModal.qrCode}`} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-xl">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {checkingStatus && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando conexão...
              </p>
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerateQR}
              disabled={generatingQR}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generatingQR ? 'animate-spin' : ''}`} />
              Atualizar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
