import { AppLayout } from "@/components/layout/AppLayout";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCompany } from "@/hooks/useCompany";
import { useState } from "react";
import {
  UserCircle,
  Plus,
  Trash2,
  Shield,
  ShoppingBag,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_CONFIG: Record<string, { label: string; description: string; icon: typeof Shield; color: string }> = {
  owner: {
    label: "Proprietário",
    description: "Acesso total ao sistema",
    icon: Shield,
    color: "bg-primary/15 text-primary border-primary/30",
  },
  gerente: {
    label: "Gerente",
    description: "Métricas gerais + todos os módulos do plano",
    icon: Shield,
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  vendedor: {
    label: "Vendedor",
    description: "Dashboard pessoal, CRM e Vendas",
    icon: ShoppingBag,
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

export default function Equipe() {
  const { members, loading, createMember, removeMember } = useTeamMembers();
  const { companyUser } = useCompany();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "vendedor" as "vendedor" | "gerente",
  });

  const isOwner = companyUser?.role === "owner";

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return;
    if (form.password.length < 6) return;

    setCreating(true);
    const { error } = await createMember(form);
    setCreating(false);

    if (!error) {
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", role: "vendedor" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeMember(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AppLayout title="Equipe">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Gestão de Equipe</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie os membros e permissões da sua equipe.
            </p>
          </div>
          {isOwner && (
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Button>
          )}
        </div>

        {/* Members List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum membro encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {members.map((member) => {
              const roleInfo = ROLE_CONFIG[member.role || "vendedor"] || ROLE_CONFIG.vendedor;
              const RoleIcon = roleInfo.icon;

              return (
                <Card
                  key={member.id}
                  className="border-border/50 bg-card/80 hover:bg-card transition-colors"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {member.name || member.email || member.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.email || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`${roleInfo.color} border text-xs font-medium px-2.5 py-1`}
                      >
                        <RoleIcon className="h-3 w-3 mr-1.5" />
                        {roleInfo.label}
                      </Badge>

                      {isOwner && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              id: member.id,
                              name: member.name || member.email || "membro",
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Member Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Membro</DialogTitle>
            <DialogDescription>
              Adicione um vendedor ou gerente à sua equipe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as "vendedor" | "gerente" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-emerald-400" />
                      <span>Vendedor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gerente">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <span>Gerente</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {form.role === "vendedor"
                  ? "Acesso a Dashboard pessoal, CRM e Vendas."
                  : "Acesso a métricas gerais e todos os módulos do plano."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !form.name ||
                !form.email ||
                form.password.length < 6
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {creating ? "Criando..." : "Criar Membro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              O membro <strong>{deleteTarget?.name}</strong> perderá acesso ao
              sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
