import { useEffect, useState } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSuppliers } from "@/hooks/useSuppliers";

interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number;
  cost_price?: number | null;
  stock: number | null;
  status: string | null;
  company_id: string;
  minimum_stock?: number | null;
  consignment_available?: boolean | null;
}

interface BatchData {
  batch_code: string;
  quantity: string;
  supplier_id: string;
}

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  cost_price: string;
  stock: string;
  status: string;
  minimum_stock: string;
  consignment_available: boolean;
  batch: BatchData;
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (data: ProductFormData, productId?: string) => void;
  isSaving: boolean;
  userEmail?: string;
}

const initialFormData: ProductFormData = {
  name: "",
  category: "",
  price: "",
  cost_price: "",
  stock: "",
  status: "active",
  minimum_stock: "0",
  consignment_available: false,
  batch: {
    batch_code: "",
    quantity: "",
    supplier_id: "",
  },
};

export function ProductModal({
  open,
  onClose,
  product,
  onSave,
  isSaving,
  userEmail = "Sistema",
}: ProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const { activeSuppliers, isLoading: loadingSuppliers } = useSuppliers();
  const currentDateTime = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category || "",
        price: product.price.toString(),
        cost_price: product.cost_price?.toString() || "",
        stock: product.stock?.toString() || "0",
        status: product.status || "active",
        minimum_stock: product.minimum_stock?.toString() || "0",
        consignment_available: product.consignment_available || false,
        batch: {
          batch_code: "",
          quantity: "",
          supplier_id: "",
        },
      });
    } else {
      setFormData(initialFormData);
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate batch for new products
    if (!isEditing && (!formData.batch.batch_code.trim() || !formData.batch.quantity)) {
      return;
    }
    
    // Validate batch for stock replenishment (when quantity is provided on edit)
    if (isEditing && formData.batch.quantity && !formData.batch.batch_code.trim()) {
      return;
    }
    
    onSave(formData, product?.id);
  };

  const isBatchValid = isEditing 
    ? (!formData.batch.quantity || (formData.batch.batch_code.trim() && formData.batch.quantity))
    : (formData.batch.batch_code.trim() && formData.batch.quantity);

  const canSubmit = formData.name.trim() && isBatchValid;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-[#1E1E1E] border-[#2A2A2A]">
        <DialogHeader className="border-b border-[#2A2A2A] pb-4">
          <DialogTitle className="text-xl font-semibold text-white">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
                Informações Básicas
              </h3>
              
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-medium">
                  Nome *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do produto"
                  className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-white font-medium">
                  Categoria
                </Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Categoria do produto"
                  className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                />
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-white font-medium">
                    Preço de Venda (R$)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0.00"
                    className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price" className="text-white font-medium">
                    Preço de Compra (R$)
                  </Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_price: e.target.value })
                    }
                    placeholder="0.00"
                    className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                  />
                </div>
              </div>

              {/* Margin Display */}
              {(() => {
                const sellPrice = parseFloat(formData.price);
                const costPrice = parseFloat(formData.cost_price);
                if (!sellPrice || !costPrice || costPrice <= 0) return null;
                const margin = ((sellPrice - costPrice) / costPrice) * 100;
                const profit = sellPrice - costPrice;
                const isPositive = margin > 0;
                return (
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#A1A1AA]">Margem de Lucro:</span>
                      <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#A1A1AA]">Lucro:</span>
                      <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        R$ {profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                {/* Minimum Stock */}
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock" className="text-white font-medium">
                    Estoque Mínimo
                  </Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    min="0"
                    value={formData.minimum_stock}
                    onChange={(e) =>
                      setFormData({ ...formData, minimum_stock: e.target.value })
                    }
                    placeholder="0"
                    className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-white font-medium">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="bg-[#121212] border-[#2A2A2A] text-white focus:border-[#C7A052] focus:ring-[#C7A052]/20">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                      <SelectItem
                        value="active"
                        className="text-white focus:bg-[#2A2A2A] focus:text-white"
                      >
                        Ativo
                      </SelectItem>
                      <SelectItem
                        value="inactive"
                        className="text-white focus:bg-[#2A2A2A] focus:text-white"
                      >
                        Inativo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Consignment Available */}
              <div className="flex items-center space-x-3 py-2">
                <Checkbox
                  id="consignment_available"
                  checked={formData.consignment_available}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, consignment_available: checked === true })
                  }
                  className="border-[#2A2A2A] data-[state=checked]:bg-[#C7A052] data-[state=checked]:border-[#C7A052]"
                />
                <Label 
                  htmlFor="consignment_available" 
                  className="text-white font-medium cursor-pointer"
                >
                  Disponível para Revendedores
                </Label>
              </div>
            </div>

            {/* Batch Entry Section */}
            <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#C7A052]" />
                <h3 className="text-sm font-medium text-[#C7A052] uppercase tracking-wider">
                  {isEditing ? "Reposição de Estoque (Novo Lote)" : "Lote de Entrada *"}
                </h3>
              </div>
              
              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#C7A052]/10 border border-[#C7A052]/30">
                <AlertTriangle className="h-4 w-4 text-[#C7A052] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#C7A052]">
                  {isEditing 
                    ? "Preencha para adicionar novo lote ao estoque. Lote é obrigatório para análise e rastreabilidade."
                    : "Lote é obrigatório para análise e rastreabilidade."
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Batch Code */}
                <div className="space-y-2">
                  <Label htmlFor="batch_code" className="text-white font-medium">
                    Código do Lote {!isEditing && "*"}
                  </Label>
                  <Input
                    id="batch_code"
                    value={formData.batch.batch_code}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        batch: { ...formData.batch, batch_code: e.target.value }
                      })
                    }
                    placeholder="Ex: LT-2024-001"
                    className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                    required={!isEditing}
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="batch_quantity" className="text-white font-medium">
                    Quantidade {!isEditing && "*"}
                  </Label>
                  <Input
                    id="batch_quantity"
                    type="number"
                    min="1"
                    value={formData.batch.quantity}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        batch: { ...formData.batch, quantity: e.target.value }
                      })
                    }
                    placeholder="0"
                    className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                    required={!isEditing}
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-white font-medium">
                  Fornecedor
                </Label>
                <Select
                  value={formData.batch.supplier_id}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      batch: { ...formData.batch, supplier_id: value },
                    })
                  }
                >
                  <SelectTrigger className="bg-[#121212] border-[#2A2A2A] text-white focus:border-[#C7A052] focus:ring-[#C7A052]/20">
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                    {activeSuppliers.map((supplier) => (
                      <SelectItem
                        key={supplier.id}
                        value={supplier.id}
                        className="text-white focus:bg-[#2A2A2A] focus:text-white"
                      >
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeSuppliers.length === 0 && !loadingSuppliers && (
                  <p className="text-xs text-[#A1A1AA]">
                    Nenhum fornecedor cadastrado. Cadastre em Meu Negócio → Fornecedores.
                  </p>
                )}
              </div>

              {/* Auto-generated fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] font-medium text-sm">
                    Data/Hora
                  </Label>
                  <div className="px-3 py-2 rounded-md bg-[#121212]/50 border border-[#2A2A2A] text-[#A1A1AA] text-sm">
                    {currentDateTime}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] font-medium text-sm">
                    Responsável
                  </Label>
                  <div className="px-3 py-2 rounded-md bg-[#121212]/50 border border-[#2A2A2A] text-[#A1A1AA] text-sm truncate">
                    {userEmail}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#2A2A2A] flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[#2A2A2A] text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !canSubmit}
              className="flex-1 bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Re-export types for compatibility
export type { ProductFormData, Product };
