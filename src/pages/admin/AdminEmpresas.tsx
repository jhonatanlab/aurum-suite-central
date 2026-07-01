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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Building2, Loader2, Eye, Clock, Wifi, WifiOff, Unlock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

interface SubscriptionRow {
  company_id: string;
  status: string | null;
  created_at: string;
}

const BLOCKED_SUB_STATUSES = new Set([
  "canceled",
  "cancelled",
  "past_due",
  "unpaid",
  "incomplete_expired",
  "paused",
]);

export function getEffectiveCompanyStatus(
  companyStatus: string | null,
  subStatus: string | null | undefined
): string | null {
  if (subStatus && BLOCKED_SUB_STATUSES.has(subStatus)) return subStatus;
  if (companyStatus && companyStatus !== "active" && companyStatus !== "trial") {
    return companyStatus;
  }
  return companyStatus;
}


export function getCompanyStatusBadge(status: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativa</Badge>;
    case "trial":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Trial</Badge>;
    case "suspended":
      return <Badge variant="destructive">Suspensa</Badge>;
    case "canceled":
    case "cancelled":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelada</Badge>;
    case "past_due":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Inadimplente</Badge>;
    case "blocked":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Bloqueada</Badge>;
    case null:
    case undefined:
    case "":
      return <Badge variant="outline">Sem status</Badge>;
    default:
      return <Badge variant="outline">{String(status).charAt(0).toUpperCase() + String(status).slice(1)}</Badge>;
  }
}

export async function unblockCompany(companyId: string) {
  const { error: cErr } = await supabase
    .from("companies")
    .update({ status: "active" })
    .eq("id", companyId);
  if (cErr) throw cErr;

  const { data: subs, error: sSelErr } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (sSelErr) throw sSelErr;

  if (subs && subs.length > 0) {
    const { error: sUpdErr } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subs[0].id);
    if (sUpdErr) throw sUpdErr;
  }
}

export default function AdminEmpresas() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmCompany, setConfirmCompany] = useState<Company | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [companiesRes, instancesRes, subsRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, cnpj, plan, status, created_at, updated_at, last_access_at, whatsapp_settings')
          .order('created_at', { ascending: false }),
        supabase
          .from('whatsapp_instances')
          .select('id, company_id, instance_id, phone_number, status, last_connected_at'),
        supabase
          .from('subscriptions')
          .select('company_id, status, created_at')
          .order('created_at', { ascending: false })
      ]);

      if (companiesRes.error) throw companiesRes.error;

      const typedCompanies = (companiesRes.data || []).map(company => ({
        ...company,
        whatsapp_settings: company.whatsapp_settings as WhatsAppSettings | null
      }));

      setCompanies(typedCompanies);
      setInstances(instancesRes.data || []);
      setSubscriptions((subsRes.data || []) as SubscriptionRow[]);
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

  const getLatestSubStatus = (companyId: string): string | null => {
    const sub = subscriptions.find(s => s.company_id === companyId);
    return sub?.status ?? null;
  };

  const getEffectiveStatusForCompany = (company: Company): string | null => {
    return getEffectiveCompanyStatus(company.status, getLatestSubStatus(company.id));
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

  const handleOpenDetails = (company: Company) => {
    setSelectedCompany(company);
    setPanelOpen(true);
  };

  const handleConfirmUnblock = async () => {
    if (!confirmCompany) return;
    setUnblocking(true);
    try {
      await unblockCompany(confirmCompany.id);
      toast({
        title: "Empresa desbloqueada",
        description: `${confirmCompany.name} agora tem acesso liberado.`,
      });
      setConfirmCompany(null);
      await fetchData();
      if (selectedCompany?.id === confirmCompany.id) {
        setSelectedCompany({ ...selectedCompany, status: "active" });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao desbloquear",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUnblocking(false);
    }
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
                    const effectiveStatus = getEffectiveStatusForCompany(company);
                    const isBlocked = effectiveStatus !== "active" && effectiveStatus !== "trial";
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
                        <TableCell>{getCompanyStatusBadge(effectiveStatus)}</TableCell>

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
                          <div className="flex items-center justify-end gap-2">
                            {isBlocked && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmCompany(company);
                                }}
                              >
                                <Unlock className="h-4 w-4 mr-1" />
                                Desbloquear
                              </Button>
                            )}
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
                          </div>
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
        company={selectedCompany ? { ...selectedCompany, status: getEffectiveStatusForCompany(selectedCompany) } : null}
        instance={selectedCompany ? getInstanceForCompany(selectedCompany.id) : null}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onRequestUnblock={(c) => setConfirmCompany(c as Company)}
      />


      <AlertDialog open={!!confirmCompany} onOpenChange={(open) => !open && setConfirmCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso libera o acesso de <strong>{confirmCompany?.name}</strong> manualmente, mesmo sem assinatura ativa no Stripe.
              Se o Stripe emitir um novo evento (ex: renovação, cancelamento), o status pode ser sobrescrito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unblocking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnblock} disabled={unblocking}>
              {unblocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
