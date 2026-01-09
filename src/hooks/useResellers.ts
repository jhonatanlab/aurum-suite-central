import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Reseller {
  id: string;
  company_id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  commission_type: "percent" | "fixed";
  commission_value: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface ResellerHistory {
  id: string;
  reseller_id: string;
  action: string;
  description: string;
  created_by: string | null;
  created_at: string;
}

export interface ResellerFormData {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  commission_type: "percent" | "fixed";
  commission_value: number;
  status: "active" | "inactive";
}

export function useResellers() {
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: resellers = [], isLoading } = useQuery({
    queryKey: ["resellers", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("resellers")
        .select("*")
        .eq("company_id", company.id)
        .order("name");
      if (error) throw error;
      return data as Reseller[];
    },
    enabled: !!company?.id,
  });

  const addHistory = async (
    resellerId: string,
    action: string,
    description: string
  ) => {
    await supabase.from("reseller_history").insert({
      reseller_id: resellerId,
      action,
      description,
      created_by: user?.email || "Sistema",
    });
  };

  const createReseller = useMutation({
    mutationFn: async (data: ResellerFormData) => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      const { data: reseller, error } = await supabase
        .from("resellers")
        .insert({
          company_id: company.id,
          name: data.name,
          document: data.document || null,
          phone: data.phone || null,
          email: data.email || null,
          commission_type: data.commission_type,
          commission_value: data.commission_value,
          status: data.status,
        })
        .select()
        .single();
      if (error) throw error;
      await addHistory(reseller.id, "created", `Revendedor "${data.name}" criado`);
      return reseller;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Revendedor criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar revendedor: " + error.message);
    },
  });

  const updateReseller = useMutation({
    mutationFn: async ({
      id,
      data,
      oldStatus,
    }: {
      id: string;
      data: ResellerFormData;
      oldStatus?: string;
    }) => {
      const { error } = await supabase
        .from("resellers")
        .update({
          name: data.name,
          document: data.document || null,
          phone: data.phone || null,
          email: data.email || null,
          commission_type: data.commission_type,
          commission_value: data.commission_value,
          status: data.status,
        })
        .eq("id", id);
      if (error) throw error;

      // Histórico de edição
      await addHistory(id, "updated", `Revendedor "${data.name}" editado`);

      // Histórico de mudança de status
      if (oldStatus && oldStatus !== data.status) {
        const statusAction = data.status === "active" ? "activated" : "deactivated";
        const statusDesc =
          data.status === "active"
            ? `Revendedor "${data.name}" ativado`
            : `Revendedor "${data.name}" inativado`;
        await addHistory(id, statusAction, statusDesc);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Revendedor atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar revendedor: " + error.message);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({
      id,
      name,
      currentStatus,
    }: {
      id: string;
      name: string;
      currentStatus: string;
    }) => {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("resellers")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      const action = newStatus === "active" ? "activated" : "deactivated";
      const desc =
        newStatus === "active"
          ? `Revendedor "${name}" ativado`
          : `Revendedor "${name}" inativado`;
      await addHistory(id, action, desc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });

  return {
    resellers,
    isLoading,
    createReseller,
    updateReseller,
    toggleStatus,
  };
}

export function useResellerHistory(resellerId: string | null) {
  return useQuery({
    queryKey: ["reseller-history", resellerId],
    queryFn: async () => {
      if (!resellerId) return [];
      const { data, error } = await supabase
        .from("reseller_history")
        .select("*")
        .eq("reseller_id", resellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ResellerHistory[];
    },
    enabled: !!resellerId,
  });
}
