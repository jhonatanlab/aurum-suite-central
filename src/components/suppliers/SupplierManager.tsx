import { useState } from 'react';
import { useSuppliers, Supplier, SupplierFormData } from '@/hooks/useSuppliers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Truck, Plus, Pencil, Trash2, Loader2, Phone, Mail, Package } from 'lucide-react';

const initialFormData: SupplierFormData = {
  name: '',
  phone: '',
  email: '',
  supplies: '',
};

export function SupplierManager() {
  const { suppliers, isLoading, createSupplier, updateSupplier, deleteSupplier, toggleSupplierStatus } = useSuppliers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      supplies: supplier.supplies || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, ...formData });
    } else {
      await createSupplier.mutateAsync(formData);
    }
    
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    await deleteSupplier.mutateAsync(supplierToDelete.id);
    setIsDeleteDialogOpen(false);
    setSupplierToDelete(null);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    await toggleSupplierStatus.mutateAsync({ id: supplier.id, active: !supplier.active });
  };

  const isSaving = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Card className="card-premium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold/10">
              <Truck className="h-5 w-5 text-gold" />
            </div>
            <div>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>Gerencie os fornecedores da sua empresa</CardDescription>
            </div>
          </div>
          <Button onClick={handleOpenCreate} className="gold-gradient text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum fornecedor cadastrado</p>
            <p className="text-sm">Clique em "Novo Fornecedor" para começar</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border hover:border-gold/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{supplier.name}</span>
                      <Badge variant={supplier.active ? "default" : "secondary"} className={supplier.active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                        {supplier.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {supplier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </span>
                      )}
                      {supplier.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </span>
                      )}
                      {supplier.supplies && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {supplier.supplies}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={supplier.active}
                      onCheckedChange={() => handleToggleStatus(supplier)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(supplier)}
                      className="text-muted-foreground hover:text-gold"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSupplierToDelete(supplier);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Atualize as informações do fornecedor' : 'Preencha os dados do novo fornecedor'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do fornecedor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="fornecedor@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplies">O que fornece</Label>
                <Input
                  id="supplies"
                  placeholder="Ex: Joias em prata, anéis, colares..."
                  value={formData.supplies}
                  onChange={(e) => setFormData({ ...formData, supplies: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="gold-gradient text-primary-foreground"
                disabled={isSaving || !formData.name.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor "{supplierToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
