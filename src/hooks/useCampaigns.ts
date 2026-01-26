import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface Campaign {
  id: string;
  company_id: string;
  title: string | null;
  message: string | null;
  status: string | null;
  channel: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  target_type: string | null;
  target_filters: Record<string, unknown> | null;
  media_url: string | null;
  media_type: string | null;
  send_speed_min: number | null;
  send_speed_max: number | null;
  total_recipients: number | null;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignFormData {
  title: string;
  message: string;
  channel: string;
  target_type: string;
  target_filters: Record<string, unknown>;
  media_url?: string;
  media_type?: string;
  send_speed_min: number;
  send_speed_max: number;
  scheduled_at?: string;
  status: string;
}

export function useCampaigns() {
  const { company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["campaigns", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!companyId,
  });

  const createCampaign = useMutation({
    mutationFn: async (formData: CampaignFormData) => {
      if (!companyId) throw new Error("Company ID not found");

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          company_id: companyId,
          title: formData.title,
          message: formData.message,
          channel: formData.channel,
          target_type: formData.target_type,
          target_filters: formData.target_filters as unknown as Json,
          media_url: formData.media_url,
          media_type: formData.media_type,
          send_speed_min: formData.send_speed_min,
          send_speed_max: formData.send_speed_max,
          scheduled_at: formData.scheduled_at,
          status: formData.status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", companyId] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar campanha:", error);
      toast.error("Erro ao criar campanha");
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...formData }: CampaignFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({
          title: formData.title,
          message: formData.message,
          channel: formData.channel,
          target_type: formData.target_type,
          target_filters: formData.target_filters as unknown as Json,
          media_url: formData.media_url,
          media_type: formData.media_type,
          send_speed_min: formData.send_speed_min,
          send_speed_max: formData.send_speed_max,
          scheduled_at: formData.scheduled_at,
          status: formData.status,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", companyId] });
      toast.success("Campanha atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar campanha:", error);
      toast.error("Erro ao atualizar campanha");
    },
  });

  const cancelCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ 
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", companyId] });
      toast.success("Campanha cancelada");
    },
    onError: (error) => {
      console.error("Erro ao cancelar campanha:", error);
      toast.error("Erro ao cancelar campanha");
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", companyId] });
      toast.success("Campanha excluída");
    },
    onError: (error) => {
      console.error("Erro ao excluir campanha:", error);
      toast.error("Erro ao excluir campanha");
    },
  });

  return {
    campaigns,
    isLoading,
    refetch,
    createCampaign,
    updateCampaign,
    cancelCampaign,
    deleteCampaign,
  };
}
