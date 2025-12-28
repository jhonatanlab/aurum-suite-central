import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/hooks/useCompany";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
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
import Financeiro from "./pages/Financeiro";
import Recorrencias from "./pages/Recorrencias";
import Garantias from "./pages/Garantias";
import Configuracoes from "./pages/Configuracoes";
import MeuNegocio from "./pages/MeuNegocio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function App() {
  return (
    <React.Fragment>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CompanyProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  
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
                    <ProtectedRoute>
                      <Whatsapp />
                    </ProtectedRoute>
                  } />
                  <Route path="/campanhas" element={
                    <ProtectedRoute>
                      <Campanhas />
                    </ProtectedRoute>
                  } />
                  <Route path="/automacoes" element={
                    <ProtectedRoute>
                      <Automacoes />
                    </ProtectedRoute>
                  } />
                  <Route path="/revendedores" element={
                    <ProtectedRoute>
                      <Revendedores />
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </CompanyProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}

export default App;