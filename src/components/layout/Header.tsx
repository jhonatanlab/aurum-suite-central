import { Bell, Search, User, ChevronRight, Home, LogOut, Building2, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

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
  "/meu-negocio": "Meu Negócio",
  "/configuracoes": "Configurações",
};

export function Header({ title }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { company, companyUser } = useCompany();
  
  const currentPath = location.pathname;
  const pageTitle = routeTitles[currentPath] || title;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      default: return 'Atendente';
    }
  };

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
          {/* Company Name Badge */}
          {company && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
              <Building2 className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                {company.name}
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative hidden lg:block">
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
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-border" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {getRoleLabel(companyUser?.role)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-muted-foreground hover:text-foreground focus:bg-secondary cursor-pointer"
                onClick={() => navigate('/meu-negocio')}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Meu Negócio
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-muted-foreground hover:text-foreground focus:bg-secondary cursor-pointer"
                onClick={() => navigate('/configuracoes')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-destructive focus:bg-secondary cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
