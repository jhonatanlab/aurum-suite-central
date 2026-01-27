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
      const { data: instancesData, error: instancesError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (instancesError) throw instancesError;

      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name');

      if (companiesError) throw companiesError;

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
      // Check if company has an active instance (status != 'expired')
      const existingActive = instances.find(
        i => i.company_id === companyId && i.status !== 'expired'
      );

      if (existingActive) {
        toast({
          title: "Instância já existe",
          description: `Esta empresa já possui uma instância ativa (status: ${existingActive.status}). Resete a instância antes de criar uma nova.`,
          variant: "destructive"
        });
        return null;
      }

      // Check if there's an expired record that can be reused
      const expiredRecord = instances.find(
        i => i.company_id === companyId && i.status === 'expired'
      );

      toast({
        title: expiredRecord ? "Recriando instância..." : "Criando instância...",
        description: "Aguarde enquanto a instância é configurada na Uazapi."
      });

      const { data, error } = await supabase.functions.invoke('uazapi-create-instance', {
        body: { companyId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao criar instância');

      const statusMsg = data.instance?.status === 'qrcode' 
        ? 'Escaneie o QR Code para conectar.' 
        : 'Gere o QR Code para conectar.';

      toast({
        title: data.wasRecreated ? "Instância recriada" : "Instância criada",
        description: `${data.wasRecreated ? 'Instância recriada' : 'Instância criada'} com sucesso. ${statusMsg}`
      });

      await fetchInstances();
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

  async function getQRCode(instanceId: string) {
    try {
      // Check if instance has instance_id before calling
      const instance = instances.find(i => i.id === instanceId);
      if (!instance?.instance_id) {
        toast({
          title: "Instância não configurada",
          description: "Esta instância não possui um ID na Uazapi. Crie a instância primeiro.",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('uazapi-get-qrcode', {
        body: { instanceId }
      });

      if (error) throw error;
      if (!data?.success && data?.error) throw new Error(data.error);

      if (data?.qrcode) {
        setInstances(prev => prev.map(i => 
          i.id === instanceId ? { ...i, qr_code: data.qrcode, status: 'qr_ready' } : i
        ));
        
        toast({
          title: "QR Code gerado",
          description: "Escaneie o QR Code para conectar."
        });
      }

      return data;
    } catch (err: any) {
      console.error('Error getting QR code:', err);
      toast({
        title: "Erro ao obter QR Code",
        description: err.message || "Não foi possível obter o QR Code.",
        variant: "destructive"
      });
      return null;
    }
  }

  async function checkStatus(instanceId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-check-status', {
        body: { instanceId }
      });

      if (error) throw error;

      if (data?.status) {
        setInstances(prev => prev.map(i => 
          i.id === instanceId ? { 
            ...i, 
            status: data.status,
            phone_number: data.phoneNumber || i.phone_number,
            qr_code: data.status === 'connected' ? null : i.qr_code
          } : i
        ));
      }

      return data;
    } catch (err: any) {
      console.error('Error checking status:', err);
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
      const { data, error } = await supabase.functions.invoke('uazapi-disconnect', {
        body: { instanceId }
      });

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
      toast({
        title: "Excluindo instância...",
        description: "Aguarde enquanto a instância é removida."
      });

      // Call delete edge function that handles DELETE on Uazapi and marks as expired
      const { data, error } = await supabase.functions.invoke('uazapi-delete-instance', {
        body: { instanceId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao excluir instância');

      // Update local state - mark as expired
      setInstances(prev => prev.map(i => 
        i.id === instanceId 
          ? { ...i, status: 'expired', qr_code: null, phone_number: null, instance_id: null, instance_token: null } 
          : i
      ));

      toast({
        title: "Instância excluída",
        description: "A instância foi marcada como expirada. A empresa pode criar uma nova instância."
      });
    } catch (err: any) {
      console.error('Error deleting instance:', err);
      toast({
        title: "Erro ao excluir",
        description: err.message || "Não foi possível excluir a instância.",
        variant: "destructive"
      });
    }
  }

  async function resetInstance(instanceId: string) {
    try {
      toast({
        title: "Resetando instância...",
        description: "Aguarde enquanto a instância é resetada."
      });

      // Call reset edge function
      const { data, error } = await supabase.functions.invoke('uazapi-reset-instance', {
        body: { instanceId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao resetar instância');

      // Update local state - clear fields and mark as expired
      setInstances(prev => prev.map(i => 
        i.id === instanceId 
          ? { ...i, status: 'expired', qr_code: null, phone_number: null, instance_id: null, instance_token: null } 
          : i
      ));

      toast({
        title: "Instância resetada",
        description: "A instância foi resetada. Você pode criar uma nova instância para esta empresa."
      });
    } catch (err: any) {
      console.error('Error resetting instance:', err);
      toast({
        title: "Erro ao resetar",
        description: err.message || "Não foi possível resetar a instância.",
        variant: "destructive"
      });
    }
  }

  async function restartInstance(instanceId: string) {
    try {
      toast({
        title: "Reiniciando...",
        description: "Aguarde enquanto a instância é reiniciada."
      });

      // Get fresh QR code
      await getQRCode(instanceId);

      toast({
        title: "Reiniciado",
        description: "QR Code atualizado. Escaneie para reconectar."
      });
    } catch (err) {
      console.error('Error restarting instance:', err);
    }
  }

  return {
    instances,
    loading,
    createInstance,
    getQRCode,
    checkStatus,
    updateInstanceStatus,
    disconnectInstance,
    deleteInstance,
    resetInstance,
    restartInstance,
    refetch: fetchInstances
  };
}
