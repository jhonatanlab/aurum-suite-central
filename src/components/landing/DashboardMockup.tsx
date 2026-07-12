import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  MessageCircle,
  Settings,
} from "lucide-react";

const SIDEBAR_ICONS = [
  { Icon: LayoutDashboard, active: true },
  { Icon: ShoppingCart, active: false },
  { Icon: Package, active: false },
  { Icon: Users, active: false },
  { Icon: MessageCircle, active: false },
  { Icon: Settings, active: false },
];

const KPIS = [
  { label: "Receita", value: "R$ 47,8k", delta: "+12%", positive: true },
  { label: "Vendas", value: "184", delta: "+8%", positive: true },
  { label: "Ticket médio", value: "R$ 259", delta: "-2%", positive: false },
];

const BAR_HEIGHTS = [30, 55, 42, 70, 60, 85, 95];

const RECENT_SALES = [
  { name: "Maria S.", value: "R$ 389" },
  { name: "Joana P.", value: "R$ 512" },
  { name: "Carla M.", value: "R$ 178" },
];

export default function DashboardMockup() {
  return (
    <div
      className="relative rounded-2xl border border-white/10 bg-aurum-surface/80 backdrop-blur-xl shadow-2xl overflow-hidden rotate-1 hover:rotate-0 transition-transform duration-500 after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_60px_-10px_hsl(var(--gold)/0.3)] after:pointer-events-none"
      aria-hidden="true"
    >
      {/* Browser bar */}
      <div className="h-8 bg-aurum-surface-2 flex items-center px-3 gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="ml-3 px-2 py-0.5 rounded bg-white/5 text-[10px] text-muted-foreground">
          aurum.app/dashboard
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-12 bg-aurum-surface-2/50 flex flex-col items-center py-3 gap-4">
          {SIDEBAR_ICONS.map(({ Icon, active }, i) => (
            <Icon
              key={i}
              className={`h-4 w-4 ${active ? "text-gold" : "text-muted-foreground"}`}
            />
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Dashboard</h3>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-white/5 bg-aurum-surface-2 p-3"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {kpi.value}
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${kpi.positive ? "text-green-400" : "text-red-400"}`}
                >
                  {kpi.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="h-24 flex items-end gap-1">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-t ${i === BAR_HEIGHTS.length - 1 ? "bg-gold" : "bg-gold/70"}`}
              />
            ))}
          </div>

          {/* Recent sales */}
          <div className="space-y-2">
            {RECENT_SALES.map((sale) => (
              <div
                key={sale.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gold/20" />
                  <span className="text-foreground/90">{sale.name}</span>
                </div>
                <span className="text-muted-foreground">{sale.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
