import { Wifi, WifiOff, QrCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstanceStatusBannerProps {
  status: string | null;
  loading?: boolean;
}

export function InstanceStatusBanner({ status, loading }: InstanceStatusBannerProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Verificando conexão...</span>
      </div>
    );
  }

  const statusConfig = {
    connected: {
      icon: Wifi,
      label: "Conectado",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    disconnected: {
      icon: WifiOff,
      label: "Desconectado",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
    waiting_qr: {
      icon: QrCode,
      label: "Aguardando QR Code",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        config.className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
