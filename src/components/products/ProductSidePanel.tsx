import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

interface ProductSidePanelProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (data: ProductFormData, productId?: string) => void;
  isSaving: boolean;
}

const initialFormData: ProductFormData = {
  name: "",
  category: "",
  price: "",
  stock: "",
  status: "active",
};

export function ProductSidePanel({
  open,
  onClose,
  product,
  onSave,
  isSaving,
}: ProductSidePanelProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category || "",
        price: product.price.toString(),
        stock: product.stock?.toString() || "0",
        status: product.status || "active",
      });
    } else {
      setFormData(initialFormData);
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, product?.id);
  };

  const isEditing = !!product;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 bg-black/60 backdrop-blur-sm",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-screen w-[420px] max-w-[90vw] z-50 transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full flex flex-col bg-[#1E1E1E] border-l border-[#2A2A2A] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? "Editar Produto" : "Novo Produto"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2A]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-white font-medium">
                  Preço (R$)
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

              {/* Stock */}
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-white font-medium">
                  Estoque
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
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

            {/* Footer */}
            <div className="p-6 border-t border-[#2A2A2A] flex gap-3">
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
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold transition-colors"
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
