import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CompanyDetailPanel } from "@/components/admin/CompanyDetailPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search, Building2, Loader2, Eye, Clock, Wifi, WifiOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppSettings {
  api_provider?: string;
  connected?: boolean;
}

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  plan: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  last_access_at: string | null;
  whatsapp_settings: WhatsAppSettings | null;
}

interface WhatsAppInstance {
  id: string;
  company_id: string;
  instance_id: string | null;
  phone_number: string | null;
  status: string;
  last_connected_at: string | null;
}

export default function AdminEmpresas() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [companiesRes, instancesRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, cnpj, plan, status, created_at, updated_at, last_access_at, whatsapp_settings')
          .order('created_at', { ascending: false }),
        supabase
          .from('whatsapp_instances')
          .select('id, company_id, instance_id, phone_number, status, last_connected_at')
      ]);

      if (companiesRes.error) throw companiesRes.error;
      
      // Type assertion for whatsapp_settings
      const typedCompanies = (companiesRes.data || []).map(company => ({
        ...company,
        whatsapp_settings: company.whatsapp_settings as WhatsAppSettings | null
      }));
      
      setCompanies(typedCompanies);
      setInstances(instancesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj?.includes(searchTerm)
  );

  const getInstanceForCompany = (companyId: string) => {
    return instances.find(i => i.company_id === companyId) || null;
  };

  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Pro</Badge>;
      case 'business':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Business</Badge>;
      case 'enterprise':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Enterprise</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativa</Badge>;
      case 'trial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Trial</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspensa</Badge>;
      default:
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativa</Badge>;
    }
  };

  const handleOpenDetails = (company: Company) => {
    setSelectedCompany(company);
    setPanelOpen(true);
  };

  return (
    <AdminLayout title="Empresas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
            <p className="text-muted-foreground">
              Gerencie todas as empresas cadastradas no sistema.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{companies.length}</span> empresas
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-red-500" />
                Lista de Empresas
              </CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background border-border"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma empresa encontrada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Plano</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">WhatsApp</TableHead>
                    <TableHead className="text-muted-foreground">Data Criação</TableHead>
                    <TableHead className="text-muted-foreground">Último Acesso</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => {
                    const instance = getInstanceForCompany(company.id);
                    return (
                      <TableRow 
                        key={company.id} 
                        className="border-border cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenDetails(company)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div>
                            <p>{company.name}</p>
                            {company.cnpj && (
                              <p className="text-xs text-muted-foreground">{company.cnpj}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getPlanBadge(company.plan)}</TableCell>
                        <TableCell>{getStatusBadge(company.status)}</TableCell>
                        <TableCell>
                          {instance?.status === 'connected' ? (
                            <div className="flex items-center gap-1.5">
                              <Wifi className="h-4 w-4 text-emerald-500" />
                              <span className="text-xs text-emerald-400">Conectado</span>
                            </div>
                          ) : instance ? (
                            <div className="flex items-center gap-1.5">
                              <WifiOff className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Desconectado</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.last_access_at ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {formatDistanceToNow(new Date(company.last_access_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(company);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CompanyDetailPanel
        company={selectedCompany}
        instance={selectedCompany ? getInstanceForCompany(selectedCompany.id) : null}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </AdminLayout>
  );
}