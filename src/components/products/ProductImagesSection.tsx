import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProductImage {
  id: string;
  product_id: string;
  company_id: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  position: number;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

interface Props {
  productId: string;
  companyId: string;
}

const BUCKET = "product-images";

export function ProductImagesSection({ productId, companyId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["product_images", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images" as any)
        .select("*")
        .eq("product_id", productId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProductImage[];
    },
    enabled: !!productId,
  });

  // Generate signed URLs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        images.map(async (img) => {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(img.file_path, 3600);
          if (data?.signedUrl) map[img.id] = data.signedUrl;
        })
      );
      if (!cancelled) setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [images]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["product_images", productId] });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const startPos = images.length;
      const hasAny = images.length > 0;
      let idx = 0;
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${companyId}/${productId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from("product_images" as any).insert({
          product_id: productId,
          company_id: companyId,
          file_path: path,
          file_size: file.size,
          file_type: file.type,
          position: startPos + idx,
          is_primary: !hasAny && idx === 0,
          uploaded_by: user?.email || null,
        } as any);
        if (insErr) throw insErr;
        idx++;
      }
    },
    onSuccess: () => {
      toast.success("Fotos enviadas");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
    onSettled: () => setUploading(false),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error: e1 } = await supabase
        .from("product_images" as any)
        .update({ is_primary: false } as any)
        .eq("product_id", productId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("product_images" as any)
        .update({ is_primary: true } as any)
        .eq("id", imageId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Capa definida");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (img: ProductImage) => {
      const { error: sErr } = await supabase.storage.from(BUCKET).remove([img.file_path]);
      if (sErr) throw sErr;
      const { error: dErr } = await supabase
        .from("product_images" as any)
        .delete()
        .eq("id", img.id);
      if (dErr) throw dErr;
    },
    onSuccess: () => {
      toast.success("Foto removida");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao remover: " + e.message),
  });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    uploadMutation.mutate(files);
    e.target.value = "";
  };

  return (
    <div className="space-y-3 pt-2 border-t border-[#2A2A2A]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">Fotos</h3>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#2A2A2A] text-[#C7A052] hover:bg-[#C7A052]/10 cursor-pointer">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Enviando..." : "Adicionar fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
            disabled={uploading}
          />
        </label>
      </div>

      {isLoading ? (
        <p className="text-xs text-[#6B6B6B]">Carregando...</p>
      ) : images.length === 0 ? (
        <p className="text-xs text-[#6B6B6B] text-center py-4">Nenhuma foto cadastrada.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-lg overflow-hidden bg-[#1E1E1E] border border-[#2A2A2A] aspect-square"
            >
              {urls[img.id] ? (
                <img src={urls[img.id]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-[#6B6B6B]" />
                </div>
              )}

              {img.is_primary && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#C7A052] text-black">
                  Capa
                </span>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-[#C7A052] text-[#C7A052] hover:bg-[#C7A052]/20"
                    onClick={() => setPrimaryMutation.mutate(img.id)}
                    title="Definir como capa"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 border-red-500/50 text-red-400 hover:bg-red-500/20"
                  onClick={() => deleteMutation.mutate(img)}
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
