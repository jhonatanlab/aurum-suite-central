import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  UserCircle,
  Package,
  Monitor,
  MessageCircle,
  Megaphone,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "CRM", icon: Users, path: "/crm" },
  { title: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { title: "Equipe", icon: UserCircle, path: "/equipe" },
  { title: "Produtos", icon: Package, path: "/produtos" },
  { title: "POS", icon: Monitor, path: "/pos" },
  { title: "Whatsapp", icon: MessageCircle, path: "/whatsapp" },
  { title: "Campanhas", icon: Megaphone, path: "/campanhas" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
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
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          const linkContent = (
            <NavLink
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:bg-sidebar-accent",
                isActive
                  ? "bg-sidebar-accent text-gold border border-gold/20"
                  : "text-muted-foreground hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-gold")} />
              {!collapsed && <span>{item.title}</span>}
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

          return <div key={item.path} className="animate-slide-in-left" style={{ animationDelay: `${index * 50}ms` }}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="absolute bottom-4 left-0 right-0 px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
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
