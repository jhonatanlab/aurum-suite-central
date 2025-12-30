import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTags, Tag } from "@/hooks/useTags";

const colorOptions = [
  { value: "#6B7280", label: "Cinza" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#F97316", label: "Laranja" },
  { value: "#EAB308", label: "Amarelo" },
  { value: "#22C55E", label: "Verde" },
  { value: "#06B6D4", label: "Ciano" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#C7A052", label: "Gold" },
];

export function TagManager() {
  const { toast } = useToast();
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags();

  // Create state
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6B7280");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const tagToDelete = tags.find((t) => t.id === deleteId);

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      toast({ title: "Nome da tag é obrigatório", variant: "destructive" });
      return;
    }

    // Check for duplicates
    if (tags.some((t) => t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
      toast({ title: "Já existe uma tag com esse nome", variant: "destructive" });
      return;
    }

    try {
      await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
      setNewTagName("");
      setNewTagColor("#6B7280");
      toast({ title: "Tag criada com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao criar tag", description: error.message, variant: "destructive" });
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    // Check for duplicates (excluding current tag)
    if (tags.some((t) => t.id !== editingId && t.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast({ title: "Já existe uma tag com esse nome", variant: "destructive" });
      return;
    }

    try {
      await updateTag.mutateAsync({ id: editingId, name: editName.trim(), color: editColor });
      cancelEditing();
      toast({ title: "Tag atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar tag", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (tag: Tag) => {
    try {
      await updateTag.mutateAsync({ id: tag.id, active: !tag.active });
      toast({ title: tag.active ? "Tag inativada" : "Tag ativada" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar tag", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteTag.mutateAsync(deleteId);
      setDeleteId(null);
      toast({ title: "Tag excluída!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir tag", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle>Gerenciar Tags</CardTitle>
        <CardDescription>
          Crie e gerencie as tags da sua empresa. Apenas tags ativas aparecerão no CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new tag */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-sm font-medium">Nome da Tag</label>
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Ex: Cliente VIP"
              className="bg-background border-border/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cor</label>
            <div className="flex gap-1.5">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewTagColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    newTagColor === c.value ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createTag.isPending || !newTagName.trim()}
            className="gold-gradient text-primary-foreground"
          >
            {createTag.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-2">Criar Tag</span>
          </Button>
        </div>

        {/* Tags list */}
        <div className="space-y-2">
          {tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma tag criada ainda.</p>
              <p className="text-sm">Crie sua primeira tag acima.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={`flex items-center gap-3 py-3 ${!tag.active ? "opacity-50" : ""}`}
                >
                  {editingId === tag.id ? (
                    // Edit mode
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-background border-border/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <div className="flex gap-1">
                        {colorOptions.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setEditColor(c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              editColor === c.value ? "border-foreground scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveEdit}
                        disabled={updateTag.isPending}
                        className="text-green-500 hover:text-green-600"
                      >
                        {updateTag.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEditing}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 font-medium">{tag.name}</span>
                      <Badge variant={tag.active ? "default" : "secondary"}>
                        {tag.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(tag)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(tag)}
                        disabled={updateTag.isPending}
                      >
                        {tag.active ? "Inativar" : "Ativar"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(tag.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{tagToDelete?.name}"? Esta ação não pode ser desfeita.
              Leads que usam esta tag não serão afetados, mas a tag será removida da lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTag.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
