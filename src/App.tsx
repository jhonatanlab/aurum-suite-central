import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/hooks/useCompany";
import { systemSettings } from "@/config/systemSettings";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import Auth from "./pages/Auth";
import CriarEmpresa from "./pages/CriarEmpresa";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Vendas from "./pages/Vendas";
import Equipe from "./pages/Equipe";
import Produtos from "./pages/Produtos";
import Whatsapp from "./pages/Whatsapp";
import Campanhas from "./pages/Campanhas";
import Automacoes from "./pages/Automacoes";
import Revendedores from "./pages/Revendedores";
import RevendedorDetalhe from "./pages/RevendedorDetalhe";
import RelatoriosRevendedores from "./pages/RelatoriosRevendedores";
import Financeiro from "./pages/Financeiro";
import Recorrencias from "./pages/Recorrencias";
import Garantias from "./pages/Garantias";
import Configuracoes from "./pages/Configuracoes";
import MeuNegocio from "./pages/MeuNegocio";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import ResetPassword from "./pages/ResetPassword";
import Billing from "./pages/Billing";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEmpresas from "./pages/admin/AdminEmpresas";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";
import AdminPlanos from "./pages/admin/AdminPlanos";

function RecoveryRedirect() {
  // Global handler: if the URL hash contains type=recovery, redirect to /reset-password
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate('/reset-password' + hash, { replace: true });
    }
  }, [navigate]);
  return null;
}

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
            <Toaster />
            <Sonner />
             <BrowserRouter>
              <RecoveryRedirect />
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/billing" element={
                  <ProtectedRoute requireCompany={true} skipSubscriptionCheck={true}>
                    <Billing />
                  </ProtectedRoute>
                } />
                
                {/* Create company route (requires auth but not company) */}
                <Route path="/criar-empresa" element={
                  <ProtectedRoute requireCompany={false}>
                    <CriarEmpresa />
                  </ProtectedRoute>
                } />
                
                {/* Protected routes (require auth and company) */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/crm" element={
                  <ProtectedRoute>
                    <CRM />
                  </ProtectedRoute>
                } />
                <Route path="/vendas" element={
                  <ProtectedRoute>
                    <Vendas />
                  </ProtectedRoute>
                } />
                <Route path="/equipe" element={
                  <ProtectedRoute>
                    <Equipe />
                  </ProtectedRoute>
                } />
                <Route path="/produtos" element={
                  <ProtectedRoute>
                    <Produtos />
                  </ProtectedRoute>
                } />
                <Route path="/whatsapp" element={
                  systemSettings.modes.mvp ? <Navigate to="/" replace /> :
                  <ProtectedRoute>
                    <Whatsapp />
                  </ProtectedRoute>
                } />
                <Route path="/campanhas" element={
                  systemSettings.modes.mvp ? <Navigate to="/" replace /> :
                  <ProtectedRoute>
                    <Campanhas />
                  </ProtectedRoute>
                } />
                <Route path="/automacoes" element={
                  systemSettings.modes.mvp ? <Navigate to="/" replace /> :
                  <ProtectedRoute>
                    <Automacoes />
                  </ProtectedRoute>
                } />
                <Route path="/revendedores" element={
                  <ProtectedRoute>
                    <Revendedores />
                  </ProtectedRoute>
                } />
                <Route path="/revendedores/:id" element={
                  <ProtectedRoute>
                    <RevendedorDetalhe />
                  </ProtectedRoute>
                } />
                <Route path="/revendedores/relatorios" element={
                  <ProtectedRoute>
                    <RelatoriosRevendedores />
                  </ProtectedRoute>
                } />
                <Route path="/financeiro" element={
                  <ProtectedRoute>
                    <Financeiro />
                  </ProtectedRoute>
                } />
                <Route path="/financeiro/recorrencias" element={
                  <ProtectedRoute>
                    <Recorrencias />
                  </ProtectedRoute>
                } />
                <Route path="/garantias" element={
                  <ProtectedRoute>
                    <Garantias />
                  </ProtectedRoute>
                } />
                <Route path="/configuracoes" element={
                  <ProtectedRoute>
                    <Configuracoes />
                  </ProtectedRoute>
                } />
                <Route path="/meu-negocio" element={
                  <ProtectedRoute>
                    <MeuNegocio />
                  </ProtectedRoute>
                } />
                
                {/* Admin routes (superadmin only) */}
                <Route path="/admin" element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/empresas" element={
                  <AdminProtectedRoute>
                    <AdminEmpresas />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/whatsapp" element={
                  <AdminProtectedRoute>
                    <AdminWhatsApp />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/planos" element={
                  <AdminProtectedRoute>
                    <AdminPlanos />
                  </AdminProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
