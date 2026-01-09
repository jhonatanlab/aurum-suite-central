import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reseller, useResellers } from "@/hooks/useResellers";
import { ResellerEditForm } from "./ResellerEditForm";
import { Search, Plus, Loader2, Users2 } from "lucide-react";

export function ResellersList() {
  const navigate = useNavigate();
  const { resellers, isLoading } = useResellers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filteredResellers = resellers.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.document?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (reseller: Reseller) => {
    navigate(`/revendedores/${reseller.id}`);
  };

  const formatCommission = (type: string, value: number) => {
    if (type === "percent") {
      return `${value}%`;
    }
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, documento ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Revendedor
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredResellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users2 className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum revendedor encontrado</p>
            <p className="text-sm">
              {search || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Clique em 'Novo Revendedor' para começar"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResellers.map((reseller) => (
                <TableRow
                  key={reseller.id}
                  className="border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleRowClick(reseller)}
                >
                  <TableCell className="font-medium">{reseller.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {reseller.document || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {reseller.phone && (
                        <p className="text-muted-foreground">{reseller.phone}</p>
                      )}
                      {reseller.email && (
                        <p className="text-muted-foreground text-xs">
                          {reseller.email}
                        </p>
                      )}
                      {!reseller.phone && !reseller.email && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-primary font-medium">
                      {formatCommission(
                        reseller.commission_type,
                        reseller.commission_value
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        reseller.status === "active" ? "default" : "secondary"
                      }
                      className={
                        reseller.status === "active"
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {reseller.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Revendedor</DialogTitle>
          </DialogHeader>
          <ResellerEditForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
