import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
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
import { ProductSidePanel } from "@/components/products/ProductSidePanel";

interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number | null;
  status: string | null;
  company_id: string;
}

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  stock: string;
  status: string;
}

export default function Produtos() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, price, stock, status, company_id")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!company?.id,
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      const { error } = await supabase.from("products").insert({
        name: data.name,
        category: data.category || null,
        price: parseFloat(data.price) || 0,
        stock: parseInt(data.stock) || 0,
        status: data.status,
        company_id: company.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto criado com sucesso!");
      handleClosePanel();
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const { error } = await supabase
        .from("products")
        .update({
          name: data.name,
          category: data.category || null,
          price: parseFloat(data.price) || 0,
          stock: parseInt(data.stock) || 0,
          status: data.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto atualizado com sucesso!");
      handleClosePanel();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto excluído com sucesso!");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (data: ProductFormData, productId?: string) => {
    if (!data.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    if (productId) {
      updateMutation.mutate({ id: productId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    const isActive = status === "active";
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          isActive
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
        }`}
      >
        {isActive ? "Ativo" : "Inativo"}
      </span>
    );
  };

  return (
    <AppLayout title="Produtos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Catálogo de Produtos
            </h2>
            <p className="text-muted-foreground">
              Gerencie seus produtos e estoque
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando produtos...
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">
                    Categoria
                  </TableHead>
                  <TableHead className="text-muted-foreground">Preço</TableHead>
                  <TableHead className="text-muted-foreground">
                    Estoque
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground w-16">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleOpenEdit(product)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category || "-"}
                    </TableCell>
                    <TableCell className="text-primary font-semibold">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.stock ?? 0}
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(product, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Side Panel */}
        <ProductSidePanel
          open={isPanelOpen}
          onClose={handleClosePanel}
          product={editingProduct}
          onSave={handleSave}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Excluir Produto
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o produto "{productToDelete?.name}
                "? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
