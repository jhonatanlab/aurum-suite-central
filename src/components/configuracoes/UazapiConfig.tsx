import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, RefreshCw, Smartphone, Wifi, WifiOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export function UazapiConfig() {
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
    if (instance?.status === 'qr_ready' || instance?.status === 'connecting') {
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

  async function handleConnect() {
    if (!company?.id) return;
    
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-create-instance', {
        body: { companyId: company.id }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao criar instância');

      toast.success('Instância criada! Escaneie o QR Code.');
      await fetchInstance();
    } catch (err: any) {
      console.error('Error connecting:', err);
      toast.error(err.message || 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }

  async function handleRefreshQR() {
    if (!instance?.id) return;
    
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-get-qrcode', {
        body: { instanceId: instance.id }
      });

      if (error) throw error;
      
      if (data?.qrcode) {
        setInstance((prev: any) => ({ ...prev, qr_code: data.qrcode, status: 'qr_ready' }));
        toast.success('QR Code atualizado!');
      }
    } catch (err: any) {
      console.error('Error refreshing QR:', err);
      toast.error('Erro ao atualizar QR Code');
    } finally {
      setConnecting(false);
    }
  }

  async function checkStatus() {
    if (!instance?.id || checkingStatus) return;
    
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-check-status', {
        body: { instanceId: instance.id }
      });

      if (error) throw error;
      
      if (data?.status === 'connected') {
        toast.success('WhatsApp conectado com sucesso!');
        await fetchInstance();
      } else if (data?.status !== instance.status) {
        setInstance((prev: any) => ({ ...prev, status: data.status }));
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
      const { error } = await supabase.functions.invoke('uazapi-disconnect', {
        body: { instanceId: instance.id }
      });

      if (error) throw error;
      
      toast.success('WhatsApp desconectado');
      await fetchInstance();
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
      const { data, error } = await supabase.functions.invoke('uazapi-reset-instance', {
        body: { instanceId: instance.id }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao resetar instância');
      
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
  const isQRReady = instance?.status === 'qr_ready' || instance?.status === 'connecting';
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
          Configuração Uazapi
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
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-green-500" />
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
                <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Existe uma instância com status "{instance.status}" mas sem QR Code válido. 
                    Resete a instância para tentar novamente.
                  </p>
                </div>
                <Button 
                  onClick={handleReset}
                  disabled={resetting}
                  variant="outline"
                  className="w-full border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
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
