import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WhatsAppInstance {
  id: string;
  company_id: string;
  instance_id: string | null;
  instance_token: string | null;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  last_connected_at: string | null;
  created_at: string;
  company?: {
    id: string;
    name: string;
  };
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstances();
  }, []);

  async function fetchInstances() {
    try {
      // Fetch instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (instancesError) throw instancesError;

      // Fetch companies to join
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name');

      if (companiesError) throw companiesError;

      // Join instances with company names
      const instancesWithCompanies = (instancesData || []).map(instance => {
        const company = companiesData?.find(c => c.id === instance.company_id);
        return {
          ...instance,
          company: company ? { id: company.id, name: company.name } : undefined
        };
      });

      setInstances(instancesWithCompanies);
    } catch (err) {
      console.error('Error fetching instances:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createInstance(companyId: string) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          company_id: companyId,
          status: 'disconnected'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Instância criada",
        description: "A instância WhatsApp foi criada com sucesso."
      });

      fetchInstances();
      return data;
    } catch (err: any) {
      console.error('Error creating instance:', err);
      toast({
        title: "Erro ao criar instância",
        description: err.message || "Não foi possível criar a instância.",
        variant: "destructive"
      });
      return null;
    }
  }

  async function updateInstanceStatus(instanceId: string, status: string) {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ status })
        .eq('id', instanceId);

      if (error) throw error;

      setInstances(prev => prev.map(i => 
        i.id === instanceId ? { ...i, status } : i
      ));

      toast({
        title: "Status atualizado",
        description: `Status alterado para: ${status}`
      });
    } catch (err) {
      console.error('Error updating instance status:', err);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    }
  }

  async function disconnectInstance(instanceId: string) {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'disconnected',
          qr_code: null,
          phone_number: null
        })
        .eq('id', instanceId);

      if (error) throw error;

      setInstances(prev => prev.map(i => 
        i.id === instanceId ? { ...i, status: 'disconnected', qr_code: null, phone_number: null } : i
      ));

      toast({
        title: "Instância desconectada",
        description: "A conexão foi encerrada com sucesso."
      });
    } catch (err) {
      console.error('Error disconnecting instance:', err);
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível desconectar a instância.",
        variant: "destructive"
      });
    }
  }

  async function deleteInstance(instanceId: string) {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instanceId);

      if (error) throw error;

      setInstances(prev => prev.filter(i => i.id !== instanceId));

      toast({
        title: "Instância removida",
        description: "A instância foi removida com sucesso."
      });
    } catch (err) {
      console.error('Error deleting instance:', err);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a instância.",
        variant: "destructive"
      });
    }
  }

  return {
    instances,
    loading,
    createInstance,
    updateInstanceStatus,
    disconnectInstance,
    deleteInstance,
    refetch: fetchInstances
  };
}