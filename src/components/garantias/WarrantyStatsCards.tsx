import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, RefreshCw, AlertTriangle, Package } from "lucide-react";
import type { WarrantyStats } from "@/hooks/useWarranties";

interface WarrantyStatsCardsProps {
  stats: WarrantyStats;
  isLoading?: boolean;
}

export function WarrantyStatsCards({ stats, isLoading }: WarrantyStatsCardsProps) {
  const cards = [
    {
      label: "Peças em Garantia",
      value: stats.totalInWarranty,
      icon: ShieldCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Trocas no Período",
      value: stats.exchangesInPeriod,
      icon: RefreshCw,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Reincidências",
      value: stats.recurrences,
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Peça Mais Problemática",
      value: stats.mostProblematicProduct?.name || "—",
      subValue: stats.mostProblematicProduct
        ? `${stats.mostProblematicProduct.count} ocorrências`
        : undefined,
      icon: Package,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : card.isText ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                      {card.value}
                    </p>
                    {card.subValue && (
                      <p className="text-xs text-muted-foreground">{card.subValue}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                )}
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
