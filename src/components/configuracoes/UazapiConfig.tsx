import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, RefreshCw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { WhatsAppCredentials } from "@/hooks/useCompany";

interface UazapiConfigProps {
  credentials?: WhatsAppCredentials;
  onConnect: () => void;
  onDisconnect: () => void;
  loading?: boolean;
}

export function UazapiConfig({ credentials, onConnect, onDisconnect, loading }: UazapiConfigProps) {
  const [showQR, setShowQR] = useState(false);
  const isConnected = credentials?.uazapi_connected || false;

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
                {isConnected ? "WhatsApp conectado e pronto para uso" : "Aguardando conexão"}
              </p>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}>
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>

        {/* QR Code Section */}
        {!isConnected && (
          <div className="space-y-4">
            {showQR ? (
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl border border-border bg-white">
                {credentials?.uazapi_qr_code ? (
                  <img 
                    src={credentials.uazapi_qr_code} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <QrCode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Gerando QR Code...</p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center">
                  Abra o WhatsApp no seu celular, vá em Configurações &gt; Aparelhos conectados e escaneie o código
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowQR(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  setShowQR(true);
                  onConnect();
                }}
                disabled={loading}
                className="w-full gold-gradient text-primary-foreground"
              >
                {loading ? (
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
            onClick={onDisconnect}
            disabled={loading}
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <WifiOff className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
