import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  MessageCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const adminMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { title: "Empresas", icon: Building2, path: "/admin/empresas" },
  { title: "WhatsApp (Uazapi)", icon: MessageCircle, path: "/admin/whatsapp" },
  { title: "Planos", icon: CreditCard, path: "/admin/planos" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-red-500">Admin SaaS</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {adminMenuItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            const linkContent = (
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-red-600/10 border-l-2 border-l-red-500 text-red-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                  collapsed && "justify-center px-2 border-l-0"
                )}
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-200",
                    isActive 
                      ? "text-red-500" 
                      : "text-muted-foreground group-hover:text-red-500"
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

        {/* Link back to main app */}
        <div className="mt-8 pt-4 border-t border-sidebar-border">
          <NavLink
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200",
              collapsed && "justify-center px-2"
            )}
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Voltar ao App</span>}
          </NavLink>
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
