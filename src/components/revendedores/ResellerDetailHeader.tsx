import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reseller, useResellers } from "@/hooks/useResellers";
import { ResellerEditForm } from "./ResellerEditForm";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Pencil,
  Ban,
  CheckCircle,
} from "lucide-react";

interface ResellerDetailHeaderProps {
  reseller: Reseller;
}

export function ResellerDetailHeader({ reseller }: ResellerDetailHeaderProps) {
  const navigate = useNavigate();
  const { toggleStatus } = useResellers();
  const [editOpen, setEditOpen] = useState(false);

  const handleToggleStatus = async () => {
    await toggleStatus.mutateAsync({
      id: reseller.id,
      name: reseller.name,
      currentStatus: reseller.status,
    });
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/revendedores")}
              className="shrink-0 mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {reseller.name}
                </h1>
                <Badge
                  variant={reseller.status === "active" ? "default" : "secondary"}
                  className={
                    reseller.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {reseller.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {reseller.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    <span>{reseller.phone}</span>
                  </div>
                )}
                {reseller.document && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{reseller.document}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2 ml-12 lg:ml-0">
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar perfil
            </Button>
            <Button
              variant={reseller.status === "active" ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
              className="gap-2"
            >
              {reseller.status === "active" ? (
                <>
                  <Ban className="h-4 w-4" />
                  Bloquear
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Ativar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Revendedor</DialogTitle>
          </DialogHeader>
          <ResellerEditForm
            reseller={reseller}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
