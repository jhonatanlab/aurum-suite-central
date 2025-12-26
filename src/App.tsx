import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Vendas from "./pages/Vendas";
import Equipe from "./pages/Equipe";
import Produtos from "./pages/Produtos";
import POS from "./pages/POS";
import Whatsapp from "./pages/Whatsapp";
import Campanhas from "./pages/Campanhas";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/whatsapp" element={<Whatsapp />} />
          <Route path="/campanhas" element={<Campanhas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
