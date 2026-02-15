import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export function PlanLimitModal({ open, onOpenChange, message }: PlanLimitModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-center">
        <DialogHeader className="items-center gap-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
            <ShieldAlert className="h-7 w-7 text-gold" />
          </div>
          <DialogTitle className="text-xl text-foreground">
            Limite do plano atingido
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {message || "Você atingiu o limite do seu plano atual. Faça upgrade para continuar."}
          </DialogDescription>
        </DialogHeader>
        <Button
          className="w-full mt-2 bg-gold hover:bg-gold/90 text-gold-foreground font-semibold"
          onClick={() => {
            onOpenChange(false);
            navigate("/billing");
          }}
        >
          Fazer Upgrade
        </Button>
      </DialogContent>
    </Dialog>
  );
}
