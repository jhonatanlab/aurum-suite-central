import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  MessageCircle,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Users2,
  Wallet,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { systemSettings } from "@/config/systemSettings";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCompany } from "@/hooks/useCompany";

// Modules accessible by "vendedor" role
const VENDEDOR_ALLOWED_PATHS = ["/", "/crm", "/vendas"];

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "CRM", icon: Users, path: "/crm" },
  { title: "Vendas (PDV)", icon: ShoppingCart, path: "/vendas" },
  { title: "Produtos", icon: Package, path: "/produtos" },
  { title: "WhatsApp", icon: MessageCircle, path: "/whatsapp" },
  { title: "Campanhas", icon: Megaphone, path: "/campanhas" },
  { title: "Automações", icon: Zap, path: "/automacoes" },
  { title: "Revendedores", icon: Users2, path: "/revendedores" },
  { title: "Financeiro", icon: Wallet, path: "/financeiro" },
  { title: "Garantias & Retornos", icon: ShieldCheck, path: "/garantias" },
  { title: "Meu Negócio", icon: Building2, path: "/meu-negocio" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { companyUser } = useCompany();
  const userRole = companyUser?.role;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-lg font-semibold gold-text">Aurum Suite</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems
            .filter((item) => !systemSettings.modes.mvp || !systemSettings.mvpHiddenModules.includes(item.path))
            .filter((item) => userRole !== 'vendedor' || VENDEDOR_ALLOWED_PATHS.includes(item.path))
            .map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-secondary border-l-2 border-l-[hsl(var(--gold))] text-[hsl(var(--gold))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                  collapsed && "justify-center px-2 border-l-0",
                  !isActive && "hover:gold-glow-subtle"
                )}
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-200",
                    isActive 
                      ? "text-[hsl(var(--gold))]" 
                      : "text-muted-foreground group-hover:text-[hsl(var(--gold))]"
                  )} 
                />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div 
                key={item.path} 
                className="animate-slide-in-left" 
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {linkContent}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200",
            collapsed && "px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
