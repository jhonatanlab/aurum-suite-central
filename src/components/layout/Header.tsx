import { Bell, Search, User, ChevronRight, Home, LogOut, Building2, Settings, AlertTriangle, Clock } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useFinancialNotifications, FinancialNotification } from "@/hooks/useFinancialNotifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const { notifications, totalCount, overdueCount } = useFinancialNotifications({ dueSoonDays: 3 });
  
  const currentPath = location.pathname;
  const pageTitle = routeTitles[currentPath] || title;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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


          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {totalCount > 0 && (
                  <span className={`absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    overdueCount > 0 ? "bg-destructive" : "bg-[hsl(var(--gold))]"
                  }`}>
                    {totalCount > 9 ? "9+" : totalCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-card border-border" align="end">
              <DropdownMenuLabel className="font-semibold text-foreground flex items-center justify-between">
                <span>Notificações</span>
                {totalCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {totalCount} pendente{totalCount !== 1 ? "s" : ""}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhuma notificação no momento
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-secondary"
                      onClick={() => navigate("/financeiro")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {notification.type === "overdue" ? (
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${
                          notification.type === "overdue" ? "text-destructive" : "text-amber-500"
                        }`}>
                          {notification.title}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {format(new Date(notification.date + "T00:00:00"), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 w-full">
                        {notification.description}
                      </p>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(notification.value)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              )}
              
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="text-center justify-center text-primary hover:text-primary focus:bg-secondary cursor-pointer"
                    onClick={() => navigate("/financeiro")}
                  >
                    Ver todas no Financeiro
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
