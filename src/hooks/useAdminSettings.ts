import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AdminSettings {
  uazapi_endpoint: string;
  uazapi_token: string;
  uazapi_webhook_url: string;
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>({
    uazapi_endpoint: '',
    uazapi_token: '',
    uazapi_webhook_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: Partial<AdminSettings> = {};
      data?.forEach(item => {
        if (item.key === 'uazapi_endpoint') settingsMap.uazapi_endpoint = item.value || '';
        if (item.key === 'uazapi_token') settingsMap.uazapi_token = item.value || '';
        if (item.key === 'uazapi_webhook_url') settingsMap.uazapi_webhook_url = item.value || '';
      });

      setSettings({
        uazapi_endpoint: settingsMap.uazapi_endpoint || '',
        uazapi_token: settingsMap.uazapi_token || '',
        uazapi_webhook_url: settingsMap.uazapi_webhook_url || ''
      });
    } catch (err) {
      console.error('Error fetching admin settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(newSettings: AdminSettings) {
    setSaving(true);
    try {
      const entries = [
        { key: 'uazapi_endpoint', value: newSettings.uazapi_endpoint },
        { key: 'uazapi_token', value: newSettings.uazapi_token },
        { key: 'uazapi_webhook_url', value: newSettings.uazapi_webhook_url }
      ];

      for (const entry of entries) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(
            { key: entry.key, value: entry.value },
            { onConflict: 'key' }
          );
        
        if (error) throw error;
      }

      setSettings(newSettings);
      toast({
        title: "Configurações salvas",
        description: "As configurações da API Uazapi foram atualizadas."
      });
    } catch (err) {
      console.error('Error saving admin settings:', err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  return {
    settings,
    setSettings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings
  };
}