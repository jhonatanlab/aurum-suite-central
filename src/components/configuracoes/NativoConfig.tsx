import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, RefreshCw, Smartphone, Wifi, WifiOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export function NativoConfig() {
  const { company } = useCompany();
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchInstance();
    }
  }, [company?.id]);

  // Poll for status when QR is ready
  useEffect(() => {
    if (instance?.status === 'qrcode' || instance?.status === 'qr_ready' || instance?.status === 'connecting') {
      const interval = setInterval(() => {
        checkStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [instance?.status, instance?.id]);

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

      // If instance already exists with instance_id, just generate QR
      if (existingInstance?.instance_id) {
        setInstance(existingInstance);
        toast.info('Instância encontrada. Gerando QR Code...');
        await handleRefreshQR();
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

      toast.success('Instância criada! Gerando QR Code...');
      
      // Wait for webhook to save the instance
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetchInstance();
      
      // Generate QR code
      await handleRefreshQR();
    } catch (err: any) {
      console.error('Error connecting:', err);
      toast.error(err.message || 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }

  async function handleRefreshQR() {
    // Fetch latest instance to get instance_id
    const { data: latestInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('company_id', company?.id)
      .maybeSingle();

    if (!latestInstance?.instance_id) {
      toast.error("ID da instância não encontrado. Tente reconectar.");
      return;
    }

    setConnecting(true);
    try {
      const settings = await getN8nSettings();
      if (!settings?.qr_url) {
        throw new Error("Configurações do n8n não encontradas. Contate o administrador.");
      }

      // Use n8n-proxy to generate QR (same as admin)
      const { data, error } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          action: "generate-qr",
          endpoint_url: settings.qr_url,
          payload: { 
            instance_id: latestInstance.instance_id,
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

      if (result.qr_code) {
        // Save QR code to Supabase
        await supabase
          .from("whatsapp_instances")
          .update({ qr_code: result.qr_code, status: "qrcode" })
          .eq("id", latestInstance.id);

        setInstance((prev: any) => ({ ...prev, qr_code: result.qr_code, status: 'qrcode' }));
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      } else {
        throw new Error("QR Code não retornado pelo servidor");
      }
    } catch (err: any) {
      console.error('Error refreshing QR:', err);
      toast.error(err.message || 'Erro ao atualizar QR Code');
    } finally {
      setConnecting(false);
    }
  }

  async function checkStatus() {
    if (!instance?.id || checkingStatus) return;
    
    setCheckingStatus(true);
    try {
      // Just re-fetch from database to check if status changed
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('id', instance.id)
        .single();

      if (data?.status === 'connected' && instance.status !== 'connected') {
        toast.success('WhatsApp conectado com sucesso!');
        setInstance(data);
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
        // Use n8n-proxy to delete instance
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

      // Delete from Supabase
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
      // Reset instance data but keep record
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
  const isQRReady = instance?.status === 'qrcode' || instance?.status === 'qr_ready' || instance?.status === 'connecting';
  const hasStuckInstance = isQRReady && !instance?.qr_code;

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
                  : isQRReady 
                    ? "Aguardando leitura do QR Code" 
                    : "Aguardando conexão"}
              </p>
            </div>
          </div>
          <Badge 
            variant={isConnected ? "default" : "secondary"} 
            className={isConnected ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : ""}
          >
            {isConnected ? "Conectado" : isQRReady ? "QR Pronto" : "Desconectado"}
          </Badge>
        </div>

        {/* QR Code Section */}
        {!isConnected && (
          <div className="space-y-4">
            {isQRReady && instance?.qr_code ? (
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl border border-border bg-white">
                <img 
                  src={instance.qr_code.startsWith('data:') ? instance.qr_code : `data:image/png;base64,${instance.qr_code}`} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Abra o WhatsApp no seu celular, vá em <strong>Configurações &gt; Aparelhos conectados</strong> e escaneie o código
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefreshQR}
                    disabled={connecting}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                    Atualizar QR
                  </Button>
                </div>
                {checkingStatus && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verificando conexão...
                  </p>
                )}
              </div>
            ) : hasStuckInstance ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Existe uma instância com status "{instance.status}" mas sem QR Code válido. 
                    Resete a instância para tentar novamente.
                  </p>
                </div>
                <Button 
                  onClick={handleReset}
                  disabled={resetting}
                  variant="outline"
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
              </div>
            ) : (
              <Button 
                onClick={handleConnect}
                disabled={connecting}
                className="w-full gold-gradient text-primary-foreground"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
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
  );
}
