import { LayoutDashboard, ShoppingCart, Users, Menu as MenuIcon, Lock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useCompany } from "@/hooks/useCompany";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const VENDEDOR_ALLOWED_PATHS = ["/", "/crm", "/vendas"];

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { blockedPaths } = usePlanUsage();
  const { companyUser } = useCompany();
  const userRole = companyUser?.role;

  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", match: (p: string) => p === "/" },
    { key: "vendas", label: "Vendas", icon: ShoppingCart, path: "/vendas", match: (p: string) => p.startsWith("/vendas") },
    { key: "clientes", label: "Clientes", icon: Users, path: "/crm?tab=contatos", match: (p: string) => p.startsWith("/crm") },
  ];

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-40 pointer-events-none px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="pointer-events-auto mx-auto max-w-md glass rounded-2xl border border-[hsl(var(--gold)/0.25)] shadow-lg shadow-black/40 backdrop-blur-xl">
        <div className="grid grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(location.pathname + location.search);
            const targetPath = item.path.split("?")[0];
            const isBlocked = blockedPaths.includes(targetPath);
            const disallowedForRole = userRole === "vendedor" && !VENDEDOR_ALLOWED_PATHS.includes(targetPath);
            const disabled = isBlocked || disallowedForRole;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  navigate(item.path);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-[hsl(var(--gold))]"
                    : "text-muted-foreground hover:text-foreground",
                  disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[hsl(var(--gold))]" />
                )}
                <Icon className="h-5 w-5" />
                <span className="flex items-center gap-1">
                  {item.label}
                  {disabled && <Lock className="h-2.5 w-2.5" />}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onMenuClick}
            className="relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <MenuIcon className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
