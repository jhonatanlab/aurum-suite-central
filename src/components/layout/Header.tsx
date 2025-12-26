import { Bell, Search, User, ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
}

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/crm": "CRM",
  "/vendas": "Vendas (PDV)",
  "/equipe": "Equipe",
  "/produtos": "Produtos",
  "/pos": "POS",
  "/whatsapp": "WhatsApp",
  "/campanhas": "Campanhas",
  "/automacoes": "Automações",
  "/revendedores": "Revendedores",
  "/financeiro": "Financeiro",
  "/garantias": "Garantias & Retornos",
  "/configuracoes": "Configurações",
};

export function Header({ title }: HeaderProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const pageTitle = routeTitles[currentPath] || title;

  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-[hsl(var(--glass-border))]">
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumb + Title */}
        <div className="flex flex-col gap-0.5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link 
              to="/" 
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="h-3 w-3" />
              <span>Home</span>
            </Link>
            {currentPath !== "/" && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{pageTitle}</span>
              </>
            )}
          </nav>
          
          {/* Page Title */}
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="w-64 bg-secondary/50 border-border pl-9 focus:border-[hsl(var(--gold)/0.5)] focus:ring-[hsl(var(--gold)/0.2)]"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--gold))]" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-secondary text-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-border" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">Administrador</p>
                  <p className="text-xs text-muted-foreground">admin@aurumsite.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-muted-foreground hover:text-foreground focus:bg-secondary">
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground hover:text-foreground focus:bg-secondary">
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-destructive focus:bg-secondary">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
