import { useEffect, useState } from "react";
import { Package, AlertTriangle, Plus, Trash2, Layers, RefreshCw, Wrench, Boxes, ArrowLeft, ArrowRight } from "lucide-react";
import { ProductImagesSection } from "./ProductImagesSection";
import { VariationsSection } from "./VariationsSection";
import { VariationWizardSteps } from "./VariationWizardSteps";
import { AttributeBuilder, type AttributeDef } from "./AttributeBuilder";
import { VariationMatrix, type VariationRow } from "./VariationMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

export interface Product {
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
  type?: string;
  pricing_mode?: string | null;
  manual_price?: number | null;
  promo_price?: number | null;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  weight_grams?: number | null;
  material?: string | null;
  plating?: string | null;
  stone?: string | null;
  supplier_reference?: string | null;
  ncm?: string | null;
  cover_image_url?: string | null;
}

interface BatchData {
  batch_code: string;
  quantity: string;
  supplier_id: string;
}

interface AdjustmentData {
  quantity: string;
  reason: string;
  batch_id?: string;
  batch_code?: string;
}

export interface BundleItemData {
  product_id: string;
  quantity: number;
}

export interface ProductFormData {
  name: string;
  category: string;
  price: string;
  cost_price: string;
  stock: string;
  status: string;
  minimum_stock: string;
  consignment_available: boolean;
  sku: string;
  batch: BatchData;
  adjustment: AdjustmentData;
  type: "simple" | "bundle" | "variable";
  pricing_mode: "auto_sum" | "manual" | "";
  manual_price: string;
  bundle_items: BundleItemData[];
  barcode: string;
  description: string;
  weight_grams: string;
  material: string;
  plating: string;
  stone: string;
  supplier_reference: string;
  ncm: string;
  variation_attributes: AttributeDef[];
  variations: VariationRow[];
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  companyId?: string | null;
  onSave: (data: ProductFormData, productId?: string) => void;
  isSaving: boolean;
  userEmail?: string;
  existingBundleItems?: BundleItemData[];
  lastBatch?: { id: string; batch_code: string; quantity: number; supplier_id: string | null } | null;
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
  sku: "",
  barcode: "",
  description: "",
  weight_grams: "",
  material: "",
  plating: "",
  stone: "",
  supplier_reference: "",
  ncm: "",
  batch: {
    batch_code: "",
    quantity: "",
    supplier_id: "",
  },
  adjustment: {
    quantity: "",
    reason: "",
  },
  type: "simple",
  pricing_mode: "",
  manual_price: "",
  bundle_items: [],
  variation_attributes: [],
  variations: [],
};

export function ProductModal({
  open,
  onClose,
  product,
  companyId,
  onSave,
  isSaving,
  userEmail = "Sistema",
  existingBundleItems = [],
  lastBatch,
}: ProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [stockAction, setStockAction] = useState<"add" | "adjust">("add");
  const [duplicateErrors, setDuplicateErrors] = useState<{ sku?: string; barcode?: string }>({});
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const { activeSuppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { products: allProducts } = useProducts();
  const currentDateTime = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const isEditing = !!product;
  const isBundle = formData.type === "bundle";
  const isVariable = formData.type === "variable";

  const currentCompanyId = product?.company_id || companyId;

  const checkDuplicateIdentifiers = (sku: string, barcode: string) => {
    const trimmedSku = sku.trim();
    const trimmedBarcode = barcode.trim();
    const errors: { sku?: string; barcode?: string } = {};

    if (trimmedSku) {
      const duplicateSku = allProducts.find(
        (p) =>
          p.id !== product?.id &&
          p.sku?.trim() === trimmedSku &&
          (!currentCompanyId || p.company_id === currentCompanyId)
      );
      if (duplicateSku) {
        errors.sku = `SKU já usado no produto "${duplicateSku.name}"`;
      }
    }

    if (trimmedBarcode) {
      const duplicateBarcode = allProducts.find(
        (p) =>
          p.id !== product?.id &&
          p.barcode?.trim() === trimmedBarcode &&
          (!currentCompanyId || p.company_id === currentCompanyId)
      );
      if (duplicateBarcode) {
        errors.barcode = `Código de barras já usado no produto "${duplicateBarcode.name}"`;
      }
    }

    setDuplicateErrors(errors);
    return errors;
  };

  useEffect(() => {
    checkDuplicateIdentifiers(formData.sku, formData.barcode);
  }, [formData.sku, formData.barcode, allProducts, product?.id, currentCompanyId]);

  // Filter only simple products for bundle composition
  const simpleProducts = allProducts.filter(
    (p) => p.status === "active" && (!product || p.id !== product.id)
  );

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
        sku: product.sku || "",
        barcode: product.barcode || "",
        description: product.description || "",
        weight_grams: product.weight_grams != null ? String(product.weight_grams) : "",
        material: product.material || "",
        plating: product.plating || "",
        stone: product.stone || "",
        supplier_reference: product.supplier_reference || "",
        ncm: product.ncm || "",
        batch: { batch_code: "", quantity: "", supplier_id: "" },
        adjustment: lastBatch
          ? { quantity: lastBatch.quantity.toString(), reason: "", batch_id: lastBatch.id, batch_code: lastBatch.batch_code }
          : { quantity: "", reason: "" },
        type: (product.type as "simple" | "bundle" | "variable") || "simple",
        pricing_mode: (product.pricing_mode as "auto_sum" | "manual") || "",
        manual_price: product.manual_price?.toString() || "",
        bundle_items: existingBundleItems,
        variation_attributes: [],
        variations: [],
      });
    } else {
      setFormData(initialFormData);
    }
    setWizardStep(1);
  }, [product, open, existingBundleItems, lastBatch]);

  const handleAddBundleItem = () => {
    setFormData({
      ...formData,
      bundle_items: [...formData.bundle_items, { product_id: "", quantity: 1 }],
    });
  };

  const handleRemoveBundleItem = (index: number) => {
    setFormData({
      ...formData,
      bundle_items: formData.bundle_items.filter((_, i) => i !== index),
    });
  };

  const handleBundleItemChange = (index: number, field: "product_id" | "quantity", value: string | number) => {
    const updated = [...formData.bundle_items];
    if (field === "quantity") {
      updated[index] = { ...updated[index], quantity: Math.max(1, Number(value)) };
    } else {
      updated[index] = { ...updated[index], product_id: String(value) };
    }
    setFormData({ ...formData, bundle_items: updated });
  };

  // Calculate auto-sum price
  const autoSumPrice = formData.bundle_items.reduce((sum, item) => {
    const prod = allProducts.find((p) => p.id === item.product_id);
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: block submit during wizard steps (variable products, new)
    if (isVariable && !isEditing && wizardStep !== 4) return;

    if (isBundle) {
      if (formData.bundle_items.length === 0) return;
      if (formData.bundle_items.some((i) => !i.product_id)) return;
      if (!formData.pricing_mode) return;
    }

    // Validate batch for simple products
    if (!isBundle && !isVariable) {
      if (!isEditing && (!formData.batch.batch_code.trim() || !formData.batch.quantity)) return;
      if (isEditing && formData.batch.quantity && !formData.batch.batch_code.trim()) return;
    }

    // Validate batch code for variable products (shared for all variations)
    if (isVariable && !isEditing) {
      if (!formData.batch.batch_code.trim()) {
        toast.error("Informe o código do lote de entrada");
        return;
      }
    }

    const identifierErrors = checkDuplicateIdentifiers(formData.sku, formData.barcode);
    if (identifierErrors.sku || identifierErrors.barcode) {
      toast.error(identifierErrors.sku || identifierErrors.barcode);
      return;
    }

    onSave(formData, product?.id);
  };

  const isBatchValid = (isBundle || isVariable)
    ? true
    : isEditing
      ? !formData.batch.quantity || (formData.batch.batch_code.trim() && !!formData.batch.quantity)
      : formData.batch.batch_code.trim() && !!formData.batch.quantity;

  const bundleValid = isBundle
    ? formData.bundle_items.length > 0 &&
      formData.bundle_items.every((i) => !!i.product_id) &&
      !!formData.pricing_mode
    : true;

  const adjustValid = !isEditing || stockAction !== "adjust" || !formData.adjustment.quantity || !!formData.adjustment.reason;
  const hasDuplicateErrors = !!duplicateErrors.sku || !!duplicateErrors.barcode;
  const canSubmit = formData.name.trim() && isBatchValid && bundleValid && adjustValid && !hasDuplicateErrors;

  // Check for duplicate products in bundle
  const hasDuplicates = (() => {
    const ids = formData.bundle_items.map((i) => i.product_id).filter(Boolean);
    return new Set(ids).size !== ids.length;
  })();

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
            {/* Product Type Selector */}
            {!isEditing && (
              <div className="space-y-2">
                <Label className="text-white font-medium">Tipo de Produto *</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "simple", bundle_items: [], pricing_mode: "", manual_price: "", variation_attributes: [], variations: [] })}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left ${
                      formData.type === "simple"
                        ? "border-[#C7A052] bg-[#C7A052]/10"
                        : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <Package className={`h-5 w-5 ${formData.type === "simple" ? "text-[#C7A052]" : "text-[#6B6B6B]"}`} />
                    <p className={`text-sm font-medium ${formData.type === "simple" ? "text-white" : "text-[#A1A1AA]"}`}>Simples</p>
                    <p className="text-xs text-[#6B6B6B]">Produto unitário</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "bundle", pricing_mode: "auto_sum", bundle_items: [{ product_id: "", quantity: 1 }], variation_attributes: [], variations: [] })}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left ${
                      formData.type === "bundle"
                        ? "border-[#C7A052] bg-[#C7A052]/10"
                        : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <Layers className={`h-5 w-5 ${formData.type === "bundle" ? "text-[#C7A052]" : "text-[#6B6B6B]"}`} />
                    <p className={`text-sm font-medium ${formData.type === "bundle" ? "text-white" : "text-[#A1A1AA]"}`}>Kit</p>
                    <p className="text-xs text-[#6B6B6B]">Combo de produtos</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: "variable", bundle_items: [], pricing_mode: "", manual_price: "", price: "0", cost_price: "", minimum_stock: "0" });
                      setWizardStep(1);
                    }}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left ${
                      formData.type === "variable"
                        ? "border-[#C7A052] bg-[#C7A052]/10"
                        : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <Boxes className={`h-5 w-5 ${formData.type === "variable" ? "text-[#C7A052]" : "text-[#6B6B6B]"}`} />
                    <p className={`text-sm font-medium ${formData.type === "variable" ? "text-white" : "text-[#A1A1AA]"}`}>Com variações</p>
                    <p className="text-xs text-[#6B6B6B]">Cor, tamanho, banho…</p>
                  </button>
                </div>
              </div>
            )}

            {/* Wizard stepper for new variable products */}
            {!isEditing && isVariable && (
              <VariationWizardSteps
                current={wizardStep}
                steps={[
                  { id: 1, label: "Dados do produto" },
                  { id: 2, label: "Atributos" },
                  { id: 3, label: "Matriz de variações" },
                ]}
                onStepClick={(id) => setWizardStep(id as 1 | 2 | 3)}
              />
            )}


            {/* Show type badge when editing */}
            {isEditing && (
              <div className="flex items-center gap-2">
                {formData.type === "bundle" ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#C7A052]/20 text-[#C7A052]">
                    <Layers className="h-3 w-3" /> Kit
                  </span>
                ) : formData.type === "variable" ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#C7A052]/20 text-[#C7A052]">
                    <Boxes className="h-3 w-3" /> Com variações
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                    <Package className="h-3 w-3" /> Simples
                  </span>
                )}
              </div>
            )}

            {/* Basic Info Section */}
            {(!(isVariable && !isEditing) || wizardStep === 1) && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
                Informações Básicas
              </h3>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-medium">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isBundle ? "Nome do kit" : "Nome do produto"}
                  className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-white font-medium">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Categoria do produto"
                  className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                />
              </div>

              {/* Identificação */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-white font-medium">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: BRC-001"
                    className={`bg-[#121212] text-white placeholder:text-[#6B6B6B] focus:ring-[#C7A052]/20 ${
                      duplicateErrors.sku
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#2A2A2A] focus:border-[#C7A052]"
                    }`}
                  />
                  {duplicateErrors.sku && (
                    <p className="text-xs text-red-400">{duplicateErrors.sku}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-white font-medium">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Leia ou digite"
                    className={`bg-[#121212] text-white placeholder:text-[#6B6B6B] focus:ring-[#C7A052]/20 ${
                      duplicateErrors.barcode
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#2A2A2A] focus:border-[#C7A052]"
                    }`}
                  />
                  {duplicateErrors.barcode && (
                    <p className="text-xs text-red-400">{duplicateErrors.barcode}</p>
                  )}
                </div>
              </div>

              {/* Ficha técnica */}
              <details className="group space-y-3 pt-2 border-t border-[#2A2A2A]">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">Ficha técnica</h3>
                  <span className="text-[#6B6B6B] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-white font-medium">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição detalhada do produto"
                      className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight_grams" className="text-white font-medium">Peso (g)</Label>
                      <Input
                        id="weight_grams"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight_grams}
                        onChange={(e) => setFormData({ ...formData, weight_grams: e.target.value })}
                        placeholder="Ex: 3.5"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="material" className="text-white font-medium">Material</Label>
                      <Input
                        id="material"
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        placeholder="Ex: Aço inox"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plating" className="text-white font-medium">Banho</Label>
                      <Input
                        id="plating"
                        value={formData.plating}
                        onChange={(e) => setFormData({ ...formData, plating: e.target.value })}
                        placeholder="Ex: Ouro 18k"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stone" className="text-white font-medium">Pedra</Label>
                      <Input
                        id="stone"
                        value={formData.stone}
                        onChange={(e) => setFormData({ ...formData, stone: e.target.value })}
                        placeholder="Ex: Zircônia"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier_reference" className="text-white font-medium">Ref. Fornecedor</Label>
                      <Input
                        id="supplier_reference"
                        value={formData.supplier_reference}
                        onChange={(e) => setFormData({ ...formData, supplier_reference: e.target.value })}
                        placeholder="Código do fornecedor"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ncm" className="text-white font-medium">NCM</Label>
                      <Input
                        id="ncm"
                        value={formData.ncm}
                        onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                        placeholder="Ex: 71131900"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {isEditing && product ? (
                <ProductImagesSection productId={product.id} companyId={product.company_id || companyId} />
              ) : (
                <div className="space-y-3 pt-2 border-t border-[#2A2A2A]">
                  <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">Fotos</h3>
                  <p className="text-xs text-[#6B6B6B] text-center py-4 border border-dashed border-[#2A2A2A] rounded-lg">
                    Salve o produto para adicionar fotos.
                  </p>
                </div>
              )}


              {/* Price & Cost - only for simple products (hidden when variable) */}
              {!isBundle && !isVariable && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-white font-medium">Preço de Venda (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_price" className="text-white font-medium">Preço de Compra (R$)</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
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
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${isPositive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#A1A1AA]">Margem de Lucro:</span>
                          <span className={`text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#A1A1AA]">Lucro:</span>
                          <span className={`text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            R$ {profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Bundle Composition */}
              {isBundle && (
                <div className="space-y-4 pt-2 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#C7A052]" />
                      <h3 className="text-sm font-medium text-[#C7A052] uppercase tracking-wider">Composição do Kit *</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddBundleItem}
                      className="border-[#2A2A2A] text-[#C7A052] hover:bg-[#C7A052]/10 hover:text-[#C7A052] h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>

                  {hasDuplicates && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-400">Produto duplicado no kit. Remova a duplicidade.</p>
                    </div>
                  )}

                  {formData.bundle_items.length === 0 && (
                    <p className="text-sm text-[#6B6B6B] text-center py-4">
                      Adicione pelo menos um produto ao kit.
                    </p>
                  )}

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {formData.bundle_items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-[#121212] border border-[#2A2A2A]">
                        <Select
                          value={item.product_id}
                          onValueChange={(v) => handleBundleItemChange(index, "product_id", v)}
                        >
                          <SelectTrigger className="flex-1 bg-transparent border-none text-white h-8 text-sm focus:ring-0">
                            <SelectValue placeholder="Selecionar produto" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                            {simpleProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-white focus:bg-[#2A2A2A] focus:text-white">
                                {p.name} — R$ {p.price.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#6B6B6B]">×</span>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleBundleItemChange(index, "quantity", e.target.value)}
                            className="w-16 h-8 bg-transparent border-[#2A2A2A] text-white text-center text-sm focus:border-[#C7A052]"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#6B6B6B] hover:text-red-400"
                          onClick={() => handleRemoveBundleItem(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Mode */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-white font-medium">Modo de Precificação *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pricing_mode: "auto_sum" })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          formData.pricing_mode === "auto_sum"
                            ? "border-[#C7A052] bg-[#C7A052]/10"
                            : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                        }`}
                      >
                        <p className={`text-sm font-medium ${formData.pricing_mode === "auto_sum" ? "text-white" : "text-[#A1A1AA]"}`}>
                          Soma Automática
                        </p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">Preço = soma dos itens</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pricing_mode: "manual" })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          formData.pricing_mode === "manual"
                            ? "border-[#C7A052] bg-[#C7A052]/10"
                            : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                        }`}
                      >
                        <p className={`text-sm font-medium ${formData.pricing_mode === "manual" ? "text-white" : "text-[#A1A1AA]"}`}>
                          Preço Manual
                        </p>
                        <p className="text-xs text-[#6B6B6B] mt-0.5">Definir valor fixo</p>
                      </button>
                    </div>

                    {/* Auto-sum preview */}
                    {formData.pricing_mode === "auto_sum" && formData.bundle_items.some((i) => i.product_id) && (
                      <div className="p-3 rounded-lg bg-[#C7A052]/10 border border-[#C7A052]/30">
                        <p className="text-xs text-[#A1A1AA]">Preço calculado</p>
                        <p className="text-lg font-bold text-[#C7A052]">
                          R$ {autoSumPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    {/* Manual price input */}
                    {formData.pricing_mode === "manual" && (
                      <div className="space-y-2">
                        <Label htmlFor="manual_price" className="text-white font-medium">Preço do Kit (R$) *</Label>
                        <Input
                          id="manual_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.manual_price}
                          onChange={(e) => setFormData({ ...formData, manual_price: e.target.value })}
                          placeholder="0.00"
                          className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stock & Status - for simple products */}
              {!isBundle && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimum_stock" className="text-white font-medium">Estoque Mínimo</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      min="0"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      placeholder="0"
                      disabled={isVariable}
                      className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-white font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-[#121212] border-[#2A2A2A] text-white focus:border-[#C7A052] focus:ring-[#C7A052]/20">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                        <SelectItem value="active" className="text-white focus:bg-[#2A2A2A] focus:text-white">Ativo</SelectItem>
                        <SelectItem value="inactive" className="text-white focus:bg-[#2A2A2A] focus:text-white">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Status for bundles */}
              {isBundle && (
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-white font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-[#121212] border-[#2A2A2A] text-white focus:border-[#C7A052] focus:ring-[#C7A052]/20">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                      <SelectItem value="active" className="text-white focus:bg-[#2A2A2A] focus:text-white">Ativo</SelectItem>
                      <SelectItem value="inactive" className="text-white focus:bg-[#2A2A2A] focus:text-white">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Consignment Available */}
              <div className="flex items-center space-x-3 py-2">
                <Checkbox
                  id="consignment_available"
                  checked={formData.consignment_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, consignment_available: checked === true })}
                  className="border-[#2A2A2A] data-[state=checked]:bg-[#C7A052] data-[state=checked]:border-[#C7A052]"
                />
                <Label htmlFor="consignment_available" className="text-white font-medium cursor-pointer">
                  Disponível para Revendedores
                </Label>
              </div>
            </div>
            )}


            {/* Stock Section - only for simple products */}
            {!isBundle && !isVariable && (
              <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
                {/* Current Stock Display when editing */}
                {isEditing && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#121212] border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#A1A1AA]" />
                      <span className="text-sm text-[#A1A1AA]">Estoque Atual</span>
                    </div>
                    <span className="text-lg font-bold text-[#C7A052]">{product?.stock ?? 0} un</span>
                  </div>
                )}

                {/* Stock Action Selector - only when editing */}
                {isEditing && (
                  <div className="space-y-2">
                    <Label className="text-white font-medium">O que você quer fazer?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStockAction("add");
                          setFormData({ ...formData, adjustment: { ...formData.adjustment, quantity: "", reason: "" } });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          stockAction === "add"
                            ? "border-[#C7A052] bg-[#C7A052]/10"
                            : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                        }`}
                      >
                        <RefreshCw className={`h-5 w-5 ${stockAction === "add" ? "text-[#C7A052]" : "text-[#6B6B6B]"}`} />
                        <div className="text-left">
                          <p className={`text-sm font-medium ${stockAction === "add" ? "text-white" : "text-[#A1A1AA]"}`}>Adicionar estoque</p>
                          <p className="text-xs text-[#6B6B6B]">Entrada de novo lote</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStockAction("adjust");
                          setFormData({ ...formData, batch: { batch_code: "", quantity: "", supplier_id: "" } });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          stockAction === "adjust"
                            ? "border-blue-400 bg-blue-400/10"
                            : "border-[#2A2A2A] bg-[#121212] hover:border-[#3A3A3A]"
                        }`}
                      >
                        <Wrench className={`h-5 w-5 ${stockAction === "adjust" ? "text-blue-400" : "text-[#6B6B6B]"}`} />
                        <div className="text-left">
                          <p className={`text-sm font-medium ${stockAction === "adjust" ? "text-white" : "text-[#A1A1AA]"}`}>Corrigir estoque</p>
                          <p className="text-xs text-[#6B6B6B]">Ajuste de contagem</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ADD STOCK: Replenishment (New Batch) — always shown on create, or when action=add on edit */}
                {(!isEditing || stockAction === "add") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-[#C7A052]" />
                    <h3 className="text-sm font-medium text-[#C7A052] uppercase tracking-wider">
                      {isEditing ? "Reposição de Estoque (Novo Lote)" : "Lote de Entrada *"}
                    </h3>
                  </div>

                  {!isEditing && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[#C7A052]/10 border border-[#C7A052]/30">
                      <AlertTriangle className="h-4 w-4 text-[#C7A052] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[#C7A052]">
                        Lote é obrigatório para análise e rastreabilidade.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch_code" className="text-white font-medium">
                        Código do Lote {!isEditing && "*"}
                      </Label>
                      <Input
                        id="batch_code"
                        value={formData.batch.batch_code}
                        onChange={(e) => setFormData({ ...formData, batch: { ...formData.batch, batch_code: e.target.value } })}
                        placeholder="Ex: LT-2024-001"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                        required={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch_quantity" className="text-white font-medium">
                        Quantidade a adicionar {!isEditing && "*"}
                      </Label>
                      <Input
                        id="batch_quantity"
                        type="number"
                        min="1"
                        value={formData.batch.quantity}
                        onChange={(e) => setFormData({ ...formData, batch: { ...formData.batch, quantity: e.target.value } })}
                        placeholder="0"
                        className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-[#C7A052] focus:ring-[#C7A052]/20"
                        required={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="text-white font-medium">Fornecedor</Label>
                    <Select
                      value={formData.batch.supplier_id}
                      onValueChange={(value) => setFormData({ ...formData, batch: { ...formData.batch, supplier_id: value } })}
                    >
                      <SelectTrigger className="bg-[#121212] border-[#2A2A2A] text-white focus:border-[#C7A052] focus:ring-[#C7A052]/20">
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                        {activeSuppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id} className="text-white focus:bg-[#2A2A2A] focus:text-white">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#A1A1AA] font-medium text-sm">Data/Hora</Label>
                      <div className="px-3 py-2 rounded-md bg-[#121212]/50 border border-[#2A2A2A] text-[#A1A1AA] text-sm">
                        {currentDateTime}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#A1A1AA] font-medium text-sm">Responsável</Label>
                      <div className="px-3 py-2 rounded-md bg-[#121212]/50 border border-[#2A2A2A] text-[#A1A1AA] text-sm truncate">
                        {userEmail}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* ADJUST STOCK: Correction — only when editing and action=adjust */}
                {isEditing && stockAction === "adjust" && formData.adjustment.batch_id && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-blue-400" />
                      <h3 className="text-sm font-medium text-blue-400 uppercase tracking-wider">
                        Corrigir Estoque (Recontagem)
                      </h3>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-400/10 border border-blue-400/30">
                      <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-400">
                        Informe o total real em estoque. O sistema calcula a diferença automaticamente.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white font-medium">Lote a corrigir</Label>
                        <Input
                          value={formData.adjustment.batch_code || ""}
                          disabled
                          className="bg-[#121212]/50 border-[#2A2A2A] text-[#A1A1AA] cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adj_quantity" className="text-white font-medium">Novo total em estoque *</Label>
                        <Input
                          id="adj_quantity"
                          type="number"
                          min="0"
                          value={formData.adjustment.quantity}
                          onChange={(e) => setFormData({ ...formData, adjustment: { ...formData.adjustment, quantity: e.target.value } })}
                          placeholder="Total real contado"
                          className="bg-[#121212] border-[#2A2A2A] text-white placeholder:text-[#6B6B6B] focus:border-blue-400 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adj_reason" className="text-white font-medium">Motivo do ajuste *</Label>
                      <Select
                        value={formData.adjustment.reason || ""}
                        onValueChange={(value) => setFormData({ ...formData, adjustment: { ...formData.adjustment, reason: value } })}
                      >
                        <SelectTrigger className="bg-[#121212] border-[#2A2A2A] text-white focus:border-blue-400 focus:ring-blue-400/20">
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                          <SelectItem value="quebra" className="text-white focus:bg-[#2A2A2A] focus:text-white">Quebra</SelectItem>
                          <SelectItem value="perda" className="text-white focus:bg-[#2A2A2A] focus:text-white">Perda</SelectItem>
                          <SelectItem value="erro_cadastro" className="text-white focus:bg-[#2A2A2A] focus:text-white">Erro no cadastro</SelectItem>
                          <SelectItem value="recontagem" className="text-white focus:bg-[#2A2A2A] focus:text-white">Recontagem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEditing && product && product.type === 'variable' && (
              <VariationsSection
                parentProduct={{
                  id: product.id,
                  company_id: product.company_id,
                  category: product.category,
                  name: product.name,
                }}
              />
            )}

            {!isEditing && isVariable && wizardStep === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
                  Atributos das variações
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Defina os atributos (ex: Cor, Tamanho) e seus valores. As combinações vão gerar automaticamente uma variação para cada.
                </p>
                <AttributeBuilder
                  attributes={formData.variation_attributes}
                  onChange={(attrs) =>
                    setFormData({ ...formData, variation_attributes: attrs })
                  }
                />
              </div>
            )}

            {!isEditing && isVariable && wizardStep === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
                  Matriz de variações
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Ajuste preço, custo, estoque e SKU de cada variação. Use "Aplicar a todas" para preencher em massa.
                </p>
                <VariationMatrix
                  attributes={formData.variation_attributes}
                  parentSku={formData.sku}
                  rows={formData.variations}
                  onChange={(rows) => setFormData({ ...formData, variations: rows })}
                />
              </div>
            )}

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

            {!isEditing && isVariable && wizardStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setWizardStep((s) => (s - 1) as 1 | 2 | 3)}
                className="border-[#2A2A2A] text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}

            {!isEditing && isVariable && wizardStep < 3 ? (
              <Button
                type="button"
                onClick={() => {
                  if (wizardStep === 1 && !formData.name.trim()) {
                    toast.error("Informe o nome do produto");
                    return;
                  }
                  if (wizardStep === 2 && formData.variation_attributes.length === 0) {
                    toast.error("Adicione ao menos um atributo com valores");
                    return;
                  }
                  setWizardStep((s) => (s + 1) as 1 | 2 | 3);
                }}
                disabled={hasDuplicates}
                className="flex-1 bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold"
              >
                Avançar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSaving || !canSubmit || hasDuplicates}
                className="flex-1 bg-[#C7A052] hover:bg-[#B8934A] text-[#121212] font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { ProductModalProps };
