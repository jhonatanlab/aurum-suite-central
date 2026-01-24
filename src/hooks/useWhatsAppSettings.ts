import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany, WhatsAppSettings } from './useCompany';
import { toast } from 'sonner';

export type WhatsAppApiProvider = 'uazapi' | 'zapi' | 'meta_oficial';

const DEFAULT_SETTINGS: WhatsAppSettings = {
  api_provider: 'uazapi',
  api_history: [],
};

export function useWhatsAppSettings() {
  const { company, refetch: refetchCompany } = useCompany();
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      const whatsappSettings = company.whatsapp_settings as WhatsAppSettings | null;
      setSettings(whatsappSettings || DEFAULT_SETTINGS);
      setLoading(false);
    }
  }, [company]);

  const updateApiProvider = async (newProvider: WhatsAppApiProvider) => {
    if (!company) return;

    setSaving(true);
    try {
      const currentSettings = settings;
      const now = new Date().toISOString();

      // Create history entry for the deactivated provider
      const updatedHistory = [...currentSettings.api_history];
      
      // Mark current provider as deactivated if different
      if (currentSettings.api_provider !== newProvider) {
        // Find the current active entry and mark it as deactivated
        const lastActiveIndex = updatedHistory.findIndex(
          (entry) => entry.provider === currentSettings.api_provider && !entry.deactivated_at
        );
        
        if (lastActiveIndex >= 0) {
          updatedHistory[lastActiveIndex] = {
            ...updatedHistory[lastActiveIndex],
            deactivated_at: now,
          };
        }

        // Add new provider as active
        updatedHistory.push({
          provider: newProvider,
          activated_at: now,
        });
      }

      const newSettings: WhatsAppSettings = {
        api_provider: newProvider,
        api_history: updatedHistory,
      };

      const { error } = await supabase
        .from('companies')
        .update({ whatsapp_settings: newSettings as any })
        .eq('id', company.id);

      if (error) throw error;

      setSettings(newSettings);
      await refetchCompany();
      toast.success('Configuração do WhatsApp atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateApiProvider,
  };
}
