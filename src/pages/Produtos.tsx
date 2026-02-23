import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Search, Package, History, Layers } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductModal, type ProductFormData, type Product, type BundleItemData } from "@/components/products/ProductModal";
import { BatchHistoryTab } from "@/components/products/BatchHistoryTab";

export default function Produtos() {
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBundleItems, setEditingBundleItems] = useState<BundleItemData[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, category, price, cost_price, stock, status, company_id, minimum_stock, consignment_available, type, pricing_mode, manual_price")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      const { data: batchesData, error: batchesError } = await supabase
        .from("product_batches")
        .select("product_id, quantity")
        .eq("company_id", company.id)
        .eq("status", "active");

      if (batchesError) throw batchesError;

      const stockByProduct = batchesData?.reduce((acc, batch) => {
        acc[batch.product_id] = (acc[batch.product_id] || 0) + batch.quantity;
        return acc;
      }, {} as Record<string, number>) || {};

      return productsData.map(product => ({
        ...product,
        stock: stockByProduct[product.id] || 0,
      })) as Product[];
    },
    enabled: !!company?.id,
  });

  const categories = useMemo(() => {
    const cats = products.map((p) => p.category).filter((c): c is string => !!c && c.trim() !== "");
    return [...new Set(cats)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const isBundle = data.type === "bundle";
      const price = isBundle
        ? (data.pricing_mode === "manual" ? parseFloat(data.manual_price) || 0 : 0)
        : parseFloat(data.price) || 0;

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: data.name,
          category: data.category || null,
          price,
          cost_price: isBundle ? null : (data.cost_price ? parseFloat(data.cost_price) : null),
          stock: 0,
          status: data.status,
          company_id: company.id,
          minimum_stock: isBundle ? 0 : (parseInt(data.minimum_stock) || 0),
          consignment_available: data.consignment_available,
          type: data.type,
          pricing_mode: isBundle ? data.pricing_mode : null,
          manual_price: isBundle && data.pricing_mode === "manual" ? parseFloat(data.manual_price) || null : null,
        })
        .select()
        .single();

      if (productError) throw productError;

      if (isBundle && data.bundle_items.length > 0) {
        const { error: bundleError } = await supabase
          .from("bundle_items")
          .insert(
            data.bundle_items.map((item) => ({
              bundle_id: newProduct.id,
              product_id: item.product_id,
              quantity: item.quantity,
            }))
          );
        if (bundleError) throw bundleError;
      }

      if (!isBundle) {
        const { error: batchError } = await supabase
          .from("product_batches")
          .insert({
            company_id: company.id,
            product_id: newProduct.id,
            batch_code: data.batch.batch_code,
            quantity: parseInt(data.batch.quantity) || 0,
            created_by: user?.email || "Sistema",
            status: "active",
            supplier_id: data.batch.supplier_id || null,
          });
        if (batchError) throw batchError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_batches"] });
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
      if (!company?.id) throw new Error("Empresa não encontrada");

      const isBundle = data.type === "bundle";
      const price = isBundle
        ? (data.pricing_mode === "manual" ? parseFloat(data.manual_price) || 0 : 0)
        : parseFloat(data.price) || 0;

      const { error: productError } = await supabase
        .from("products")
        .update({
          name: data.name,
          category: data.category || null,
          price,
          cost_price: isBundle ? null : (data.cost_price ? parseFloat(data.cost_price) : null),
          status: data.status,
          minimum_stock: isBundle ? 0 : (parseInt(data.minimum_stock) || 0),
          consignment_available: data.consignment_available,
          pricing_mode: isBundle ? data.pricing_mode : null,
          manual_price: isBundle && data.pricing_mode === "manual" ? parseFloat(data.manual_price) || null : null,
        })
        .eq("id", id);

      if (productError) throw productError;

      // For bundles, replace all bundle_items
      if (isBundle) {
        const { error: deleteError } = await supabase
          .from("bundle_items")
          .delete()
          .eq("bundle_id", id);
        if (deleteError) throw deleteError;

        if (data.bundle_items.length > 0) {
          const { error: insertError } = await supabase
            .from("bundle_items")
            .insert(
              data.bundle_items.map((item) => ({
                bundle_id: id,
                product_id: item.product_id,
                quantity: item.quantity,
              }))
            );
          if (insertError) throw insertError;
        }
      }

      // Stock replenishment for simple products (new batch)
      if (!isBundle && data.batch.batch_code && data.batch.quantity) {
        const qty = parseInt(data.batch.quantity) || 0;
        if (qty > 0) {
          const { error: batchError } = await supabase
            .from("product_batches")
            .insert({
              company_id: company.id,
              product_id: id,
              batch_code: data.batch.batch_code,
              quantity: qty,
              created_by: user?.email || "Sistema",
              status: "active",
              supplier_id: data.batch.supplier_id || null,
              batch_type: "replenishment",
            });
          if (batchError) throw batchError;
        }
      }

      // Stock adjustment for simple products
      if (!isBundle && data.adjustment.quantity && data.adjustment.reason) {
        const adjQty = parseInt(data.adjustment.quantity) || 0;
        if (adjQty !== 0) {
          const adjCode = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          const { error: adjError } = await supabase
            .from("product_batches")
            .insert({
              company_id: company.id,
              product_id: id,
              batch_code: adjCode,
              quantity: adjQty,
              created_by: user?.email || "Sistema",
              status: "active",
              batch_type: "adjustment",
              adjustment_reason: data.adjustment.reason,
            });
          if (adjError) throw adjError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_batches"] });
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
      const { error } = await supabase
        .from("products")
        .update({ status: "inactive" })
        .eq("id", id);
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
    setEditingBundleItems([]);
    setIsPanelOpen(true);
  };

  const handleOpenEdit = async (product: Product) => {
    setEditingProduct(product);

    // Load bundle items if product is a bundle
    if (product.type === "bundle") {
      const { data } = await supabase
        .from("bundle_items")
        .select("product_id, quantity")
        .eq("bundle_id", product.id);
      setEditingBundleItems(
        (data || []).map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
      );
    } else {
      setEditingBundleItems([]);
    }

    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setEditingProduct(null);
    setEditingBundleItems([]);
  };

  const handleSave = (data: ProductFormData, productId?: string) => {
    if (!data.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    if (data.type === "bundle") {
      if (data.bundle_items.length === 0) {
        toast.error("Kit deve ter pelo menos um item");
        return;
      }
      if (!data.pricing_mode) {
        toast.error("Selecione o modo de precificação");
        return;
      }
    } else {
      if (!productId && (!data.batch.batch_code.trim() || !data.batch.quantity)) {
        toast.error("Código do lote e quantidade são obrigatórios para novo produto");
        return;
      }
      // Validate adjustment: if quantity is set, reason is required
      if (productId && data.adjustment.quantity && !data.adjustment.reason) {
        toast.error("Selecione o motivo do ajuste de estoque");
        return;
      }
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
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    const isActive = status === "active";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
        {isActive ? "Ativo" : "Inativo"}
      </span>
    );
  };

  const getStockStatus = (product: Product) => {
    if (product.type === "bundle") {
      return <span className="text-muted-foreground text-xs italic">Kit</span>;
    }
    const stock = product.stock ?? 0;
    const minStock = product.minimum_stock ?? 0;
    if (stock === 0) return <span className="text-red-400 font-medium">{stock}</span>;
    if (minStock > 0 && stock <= minStock) return <span className="text-yellow-400 font-medium">{stock}</span>;
    return <span className="text-muted-foreground">{stock}</span>;
  };

  const getTypeBadge = (product: Product) => {
    if (product.type === "bundle") {
      return (
        <span className="flex items-center gap-1 text-xs text-primary">
          <Layers className="h-3 w-3" /> Kit
        </span>
      );
    }
    return null;
  };

  return (
    <AppLayout title="Produtos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Catálogo de Produtos</h2>
            <p className="text-muted-foreground">Gerencie seus produtos e estoque</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Package className="w-4 h-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="batch-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <History className="w-4 h-4" />
              Histórico de Lotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 bg-background border-border text-foreground focus:border-primary focus:ring-primary/20">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-muted focus:text-foreground">Todos</SelectItem>
                  <SelectItem value="active" className="text-foreground focus:bg-muted focus:text-foreground">Ativo</SelectItem>
                  <SelectItem value="inactive" className="text-foreground focus:bg-muted focus:text-foreground">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-background border-border text-foreground focus:border-primary focus:ring-primary/20">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-muted focus:text-foreground">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-foreground focus:bg-muted focus:text-foreground">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando produtos...</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum produto cadastrado. Clique em "Novo Produto" para começar.</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum produto encontrado com os filtros aplicados.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-muted-foreground">Categoria</TableHead>
                      <TableHead className="text-muted-foreground">Preço</TableHead>
                      <TableHead className="text-muted-foreground">Estoque</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleOpenEdit(product)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {product.name}
                            {getTypeBadge(product)}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.category || "-"}</TableCell>
                        <TableCell className="text-primary font-semibold">{formatCurrency(product.price)}</TableCell>
                        <TableCell>{getStockStatus(product)}</TableCell>
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
          </TabsContent>

          <TabsContent value="batch-history" className="mt-6">
            <BatchHistoryTab />
          </TabsContent>
        </Tabs>

        {/* Product Modal */}
        <ProductModal
          open={isPanelOpen}
          onClose={handleClosePanel}
          product={editingProduct}
          onSave={handleSave}
          isSaving={createMutation.isPending || updateMutation.isPending}
          userEmail={user?.email}
          existingBundleItems={editingBundleItems}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Excluir Produto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o produto "{productToDelete?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
