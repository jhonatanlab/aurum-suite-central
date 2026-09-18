import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteCompanyDialogProps {
  company: { id: string; name: string } | null;
  usage?: { products: number; sales: number; leads: number; resellers: number; users: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteCompanyDialog({
  company,
  usage,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCompanyDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const canDelete =
    !!company && confirmText.trim().toLowerCase() === company.name.trim().toLowerCase() && !loading;

  const handleClose = (value: boolean) => {
    if (loading) return;
    if (!value) setConfirmText("");
    onOpenChange(value);
  };

  const handleDelete = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-company", {
        body: { company_id: company.id, confirm_name: confirmText.trim() },
      });

      const payloadError = (data as { error?: string } | null)?.error;
      if (error || payloadError) {
        let message = payloadError || error?.message || "Erro desconhecido";
        const ctx = (error as { context?: Response })?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          } catch {
            /* ignore */
          }
        }
        throw new Error(message);
      }

      toast({
        title: "Empresa excluída",
        description: `${company.name} e todos os seus dados foram removidos definitivamente.`,
      });
      setConfirmText("");
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir empresa definitivamente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Esta ação é <strong className="text-foreground">irreversível</strong>. Todos os dados de{" "}
                <strong className="text-foreground">{company?.name}</strong> serão apagados e os usuários perderão o
                acesso. Assinaturas ativas serão canceladas automaticamente.
              </p>
              {usage && (
                <ul className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <li>{usage.products} produtos</li>
                  <li>{usage.sales} vendas</li>
                  <li>{usage.leads} clientes / leads</li>
                  <li>{usage.resellers} revendedores</li>
                  <li>{usage.users} usuários de acesso</li>
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-company-name" className="text-sm text-foreground">
            Digite <span className="font-semibold">{company?.name}</span> para confirmar
          </Label>
          <Input
            id="confirm-company-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={company?.name}
            className="bg-background border-border"
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!canDelete} onClick={handleDelete}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir definitivamente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
