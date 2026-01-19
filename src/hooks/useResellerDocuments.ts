import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ResellerDocument {
  id: string;
  reseller_id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useResellerDocuments(resellerId: string | null) {
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["reseller-documents", resellerId],
    queryFn: async () => {
      if (!resellerId) return [];
      const { data, error } = await supabase
        .from("reseller_documents")
        .select("*")
        .eq("reseller_id", resellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ResellerDocument[];
    },
    enabled: !!resellerId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ resellerId, file }: { resellerId: string; file: File }) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${resellerId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("reseller-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { data, error: dbError } = await supabase
        .from("reseller_documents")
        .insert({
          reseller_id: resellerId,
          company_id: company.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.email || "Sistema",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add to reseller history
      await supabase.from("reseller_history").insert({
        reseller_id: resellerId,
        action: "document_uploaded",
        description: `Documento "${file.name}" enviado`,
        created_by: user?.email || "Sistema",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-documents"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history"] });
      toast.success("Documento enviado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao enviar documento: " + error.message);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: ResellerDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("reseller-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("reseller_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;

      // Add to reseller history
      await supabase.from("reseller_history").insert({
        reseller_id: document.reseller_id,
        action: "document_deleted",
        description: `Documento "${document.file_name}" removido`,
        created_by: user?.email || "Sistema",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-documents"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history"] });
      toast.success("Documento removido com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover documento: " + error.message);
    },
  });

  const getDocumentUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("reseller-documents")
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    return data?.signedUrl;
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
  };
}
