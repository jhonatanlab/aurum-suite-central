import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, FileText, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  category_id: string | null;
  type: string;
  value: number;
  method: string | null;
  status: string;
  receipt_path?: string | null;
}

interface TransactionSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingTransaction?: FinancialTransaction | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

const STATUS_OPTIONS = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
];

export function TransactionSidePanel({ open, onOpenChange, onSuccess, editingTransaction }: TransactionSidePanelProps) {
  const { company } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [type, setType] = useState<string>("entrada");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [status, setStatus] = useState<string>("pendente");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptPath, setExistingReceiptPath] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const isEditing = !!editingTransaction;

  const { data: categories = [] } = useQuery({
    queryKey: ["financial_categories", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("company_id", company.id);

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!company?.id,
  });

  // Filter categories by type
  const filteredCategories = categories.filter(
    (cat) => cat.type === type || cat.type === "ambos"
  );

  const resetForm = () => {
    setType("entrada");
    setDate(new Date());
    setDescription("");
    setCategoryId("");
    setValue("");
    setMethod("");
    setStatus("pendente");
    setReceiptFile(null);
    setExistingReceiptPath(null);
  };

  useEffect(() => {
    if (open && editingTransaction) {
      setType(editingTransaction.type);
      setDate(new Date(editingTransaction.date + "T00:00:00"));
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.category_id || "");
      setValue(editingTransaction.value.toString());
      setMethod(editingTransaction.method || "");
      setStatus(editingTransaction.status);
      setExistingReceiptPath(editingTransaction.receipt_path || null);
      setReceiptFile(null);
    } else if (!open) {
      resetForm();
    }
  }, [open, editingTransaction]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error("Formato inválido. Use JPG, PNG, WebP ou PDF.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 5MB.");
        return;
      }
      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (transactionId: string): Promise<string | null> => {
    if (!receiptFile || !company?.id) return existingReceiptPath;

    const fileExt = receiptFile.name.split('.').pop();
    const filePath = `${company.id}/${transactionId}.${fileExt}`;

    const { error } = await supabase.storage
      .from('financial-receipts')
      .upload(filePath, receiptFile, { upsert: true });

    if (error) {
      console.error("Erro ao fazer upload:", error);
      throw error;
    }

    return filePath;
  };

  const getReceiptUrl = () => {
    if (!existingReceiptPath) return null;
    const { data } = supabase.storage
      .from('financial-receipts')
      .getPublicUrl(existingReceiptPath);
    return data.publicUrl;
  };

  const handleViewReceipt = async () => {
    if (!existingReceiptPath) return;
    
    const { data, error } = await supabase.storage
      .from('financial-receipts')
      .createSignedUrl(existingReceiptPath, 60);
    
    if (error || !data?.signedUrl) {
      toast.error("Erro ao acessar comprovante");
      return;
    }
    
    window.open(data.signedUrl, '_blank');
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setExistingReceiptPath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!company?.id) {
      toast.error("Empresa não encontrada");
      return;
    }

    if (!description.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    if (!value || parseFloat(value) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    setIsSubmitting(true);

    try {
      const baseData = {
        company_id: company.id,
        type,
        date: format(date, "yyyy-MM-dd"),
        description: description.trim(),
        category_id: categoryId || null,
        value: parseFloat(value),
        method: method || null,
        status,
        paid_at: status === "pago" ? new Date().toISOString() : null,
      };

      let transactionId = editingTransaction?.id;

      if (isEditing) {
        // Handle receipt upload for existing transaction
        let updateData: typeof baseData & { receipt_path?: string | null } = { ...baseData };
        
        if (receiptFile) {
          const receiptPath = await uploadReceipt(editingTransaction.id);
          updateData.receipt_path = receiptPath;
        } else if (existingReceiptPath === null && editingTransaction.receipt_path) {
          // Receipt was removed
          updateData.receipt_path = null;
        }

        const { error } = await supabase
          .from("financial_transactions")
          .update(updateData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast.success("Movimentação atualizada com sucesso");
      } else {
        const { data, error } = await supabase
          .from("financial_transactions")
          .insert(baseData)
          .select('id')
          .single();

        if (error) throw error;
        
        transactionId = data.id;

        // Upload receipt for new transaction
        if (receiptFile && transactionId) {
          const receiptPath = await uploadReceipt(transactionId);
          if (receiptPath) {
            await supabase
              .from("financial_transactions")
              .update({ receipt_path: receiptPath })
              .eq("id", transactionId);
          }
        }

        toast.success("Movimentação registrada com sucesso");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar movimentação:", error);
      toast.error("Erro ao salvar movimentação");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic value input styling based on type
  const valueInputClassName = cn(
    "bg-background border-border font-semibold",
    type === "entrada" && "text-emerald-500 focus:ring-emerald-500",
    type === "saida" && "text-red-500 focus:ring-red-500"
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {isEditing ? "Editar Movimentação" : "Nova Movimentação"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-border",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento fornecedor"
              className="bg-background border-border"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {filteredCategories.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma categoria disponível
                  </SelectItem>
                ) : (
                  filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className={valueInputClassName}
            />
          </div>

          {/* Método */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Método de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comprovante - apenas para status "pago" */}
          {status === "pago" && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Comprovante (opcional)</Label>
              
              {/* Existing receipt or new file preview */}
              {(existingReceiptPath || receiptFile) ? (
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {receiptFile?.name || "Comprovante anexado"}
                  </span>
                  <div className="flex items-center gap-1">
                    {existingReceiptPath && !receiptFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleViewReceipt}
                        className="h-8 w-8 text-primary hover:text-primary/80"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeReceipt}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para anexar (JPG, PNG, PDF)
                  </span>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Salvar Movimentação"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
