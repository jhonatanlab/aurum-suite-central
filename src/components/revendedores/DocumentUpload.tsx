import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  useResellerDocuments,
  ResellerDocument,
} from "@/hooks/useResellerDocuments";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  FileImage,
  File,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentUploadProps {
  resellerId: string | null;
  readOnly?: boolean;
}

export function DocumentUpload({ resellerId, readOnly = false }: DocumentUploadProps) {
  const { documents, isLoading, uploadDocument, deleteDocument, getDocumentUrl } =
    useResellerDocuments(resellerId);
  const [deleteTarget, setDeleteTarget] = useState<ResellerDocument | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resellerId) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo permitido: 10MB");
      return;
    }

    await uploadDocument.mutateAsync({ resellerId, file });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: ResellerDocument) => {
    setDownloading(doc.id);
    try {
      const url = await getDocumentUrl(doc.file_path);
      if (url) {
        window.open(url, "_blank");
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDocument.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith("image/")) {
      return <FileImage className="h-4 w-4 text-blue-400" />;
    }
    if (fileType === "application/pdf") {
      return <FileText className="h-4 w-4 text-red-400" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!resellerId) {
    return (
      <div className="space-y-3">
        <Label>Documentos</Label>
        <p className="text-sm text-muted-foreground">
          Salve o revendedor primeiro para anexar documentos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Documentos</Label>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDocument.isPending}
            className="gap-2"
          >
            {uploadDocument.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Anexar
          </Button>
        )}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          Nenhum documento anexado
        </p>
      ) : (
        <ScrollArea className="max-h-40">
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30 gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getFileIcon(doc.file_type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)} •{" "}
                      {format(new Date(doc.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(doc)}
                      disabled={deleteDocument.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o documento "{deleteTarget?.file_name}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
