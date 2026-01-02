import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Search, Eye, Receipt, FileText } from "lucide-react";
import { SaleDetailPanel } from "./SaleDetailPanel";

interface Sale {
  id: string;
  created_at: string;
  customer_name: string | null;
  client_id: string | null;
  payment_method: string | null;
  total: number;
  discount_value: number | null;
  status: string;
  seller_id: string | null;
  leads?: { name: string } | null;
}

interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number | null;
  products: { name: string } | null;
}

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
  boleto: "Boleto",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Concluída", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  refunded: { label: "Estornada", variant: "secondary" },
};

export function SalesHistoryTab() {
  const { company } = useCompany();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-history", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          customer_name,
          client_id,
          payment_method,
          total,
          discount_value,
          status,
          seller_id,
          leads:client_id (name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!company?.id,
  });

  const { data: saleDetails } = useQuery({
    queryKey: ["sale-details", selectedSaleId],
    queryFn: async () => {
      if (!selectedSaleId) return null;
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          id,
          quantity,
          price,
          subtotal,
          products:product_id (name)
        `)
        .eq("sale_id", selectedSaleId);
      if (error) throw error;
      return data as SaleItem[];
    },
    enabled: !!selectedSaleId,
  });

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter((sale) => {
      // Search filter
      const clientName = sale.leads?.name || sale.customer_name || "";
      if (searchQuery && !clientName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Date filters
      if (dateFrom) {
        const saleDate = new Date(sale.created_at);
        const fromDate = new Date(dateFrom);
        if (saleDate < fromDate) return false;
      }
      
      if (dateTo) {
        const saleDate = new Date(sale.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (saleDate > toDate) return false;
      }
      
      // Status filter
      if (statusFilter !== "all" && sale.status !== statusFilter) {
        return false;
      }
      
      // Payment filter
      if (paymentFilter !== "all" && sale.payment_method !== paymentFilter) {
        return false;
      }
      
      return true;
    });
  }, [sales, searchQuery, dateFrom, dateTo, statusFilter, paymentFilter]);

  const selectedSale = useMemo(() => {
    if (!selectedSaleId || !sales) return null;
    return sales.find((s) => s.id === selectedSaleId) || null;
  }, [selectedSaleId, sales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setPaymentFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-secondary rounded-xl border border-border p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Data Inicial</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Data Final</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="refunded">Estornada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Pagamento</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credit">Cartão de Crédito</SelectItem>
                <SelectItem value="debit">Cartão de Débito</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-secondary rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma venda encontrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Nº Pedido</TableHead>
                <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                <TableHead className="text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-muted-foreground">Valor Total</TableHead>
                <TableHead className="text-muted-foreground">Pagamento</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow 
                  key={sale.id} 
                  className="border-border hover:bg-card/50 cursor-pointer"
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <TableCell className="font-mono text-sm">
                    #{sale.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {sale.leads?.name || sale.customer_name || "Consumidor Final"}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(sale.total)}
                  </TableCell>
                  <TableCell>
                    {paymentMethodLabels[sale.payment_method || ""] || sale.payment_method || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[sale.status]?.variant || "outline"}>
                      {statusLabels[sale.status]?.label || sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSaleId(sale.id);
                      }}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sale Detail Panel */}
      <SaleDetailPanel
        sale={selectedSale}
        items={saleDetails || []}
        open={!!selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
      />
    </div>
  );
}
