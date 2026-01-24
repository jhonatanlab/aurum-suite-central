import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany, WhatsAppSettings, WhatsAppCredentials } from './useCompany';
import { toast } from 'sonner';

export type WhatsAppApiProvider = 'uazapi' | 'zapi' | 'meta_oficial';

const DEFAULT_SETTINGS: WhatsAppSettings = {
  api_provider: 'uazapi',
  api_history: [],
  credentials: {},
  connected: false,
};

export function useWhatsAppSettings() {
  const { company, refetch: refetchCompany } = useCompany();
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (company) {
      const whatsappSettings = company.whatsapp_settings as WhatsAppSettings | null;
      setSettings(whatsappSettings || DEFAULT_SETTINGS);
      setLoading(false);
    }
  }, [company]);

  const saveSettings = async (newSettings: WhatsAppSettings) => {
    if (!company) return;

    const { error } = await supabase
      .from('companies')
      .update({ whatsapp_settings: newSettings as any })
      .eq('id', company.id);

    if (error) throw error;

    setSettings(newSettings);
    await refetchCompany();
  };

  const updateApiProvider = async (newProvider: WhatsAppApiProvider) => {
    if (!company) return;

    setSaving(true);
    try {
      const currentSettings = settings;
      const now = new Date().toISOString();

      const updatedHistory = [...currentSettings.api_history];
      
      if (currentSettings.api_provider !== newProvider) {
        const lastActiveIndex = updatedHistory.findIndex(
          (entry) => entry.provider === currentSettings.api_provider && !entry.deactivated_at
        );
        
        if (lastActiveIndex >= 0) {
          updatedHistory[lastActiveIndex] = {
            ...updatedHistory[lastActiveIndex],
            deactivated_at: now,
          };
        }

        updatedHistory.push({
          provider: newProvider,
          activated_at: now,
        });
      }

      const newSettings: WhatsAppSettings = {
        ...currentSettings,
        api_provider: newProvider,
        api_history: updatedHistory,
        connected: false, // Reset connection when changing provider
      };

      await saveSettings(newSettings);
      setTestResult(null);
      toast.success('Provedor de API atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  // Uazapi handlers
  const connectUazapi = async () => {
    setSaving(true);
    try {
      // Simulate QR code generation - in real implementation, call the API
      const newSettings: WhatsAppSettings = {
        ...settings,
        credentials: {
          ...settings.credentials,
          uazapi_qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=WhatsApp-Demo-QR',
        },
      };
      await saveSettings(newSettings);
      
      // Simulate successful connection after 3 seconds
      setTimeout(async () => {
        const connectedSettings: WhatsAppSettings = {
          ...newSettings,
          credentials: {
            ...newSettings.credentials,
            uazapi_connected: true,
            uazapi_session_id: `session_${Date.now()}`,
          },
          connected: true,
          last_connected_at: new Date().toISOString(),
        };
        await saveSettings(connectedSettings);
        toast.success('WhatsApp conectado com sucesso!');
      }, 3000);
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast.error('Erro ao gerar QR Code');
    } finally {
      setSaving(false);
    }
  };

  const disconnectUazapi = async () => {
    setSaving(true);
    try {
      const newSettings: WhatsAppSettings = {
        ...settings,
        credentials: {
          ...settings.credentials,
          uazapi_connected: false,
          uazapi_qr_code: undefined,
          uazapi_session_id: undefined,
        },
        connected: false,
      };
      await saveSettings(newSettings);
      toast.success('WhatsApp desconectado');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar');
    } finally {
      setSaving(false);
    }
  };

  // Z-Api handlers
  const saveZapiCredentials = async (token: string, instance: string) => {
    setSaving(true);
    try {
      const newSettings: WhatsAppSettings = {
        ...settings,
        credentials: {
          ...settings.credentials,
          zapi_token: token,
          zapi_instance: instance,
        },
      };
      await saveSettings(newSettings);
      toast.success('Credenciais salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  };

  const testZapiConnection = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      // Simulate API test - in real implementation, call the Z-Api endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success/failure based on whether credentials exist
      const hasCredentials = settings.credentials?.zapi_token && settings.credentials?.zapi_instance;
      
      if (hasCredentials) {
        const newSettings: WhatsAppSettings = {
          ...settings,
          credentials: {
            ...settings.credentials,
            zapi_connected: true,
          },
          connected: true,
          last_connected_at: new Date().toISOString(),
        };
        await saveSettings(newSettings);
        setTestResult('success');
        toast.success('Conexão testada com sucesso!');
      } else {
        setTestResult('error');
        toast.error('Falha na conexão');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setTestResult('error');
      toast.error('Erro ao testar conexão');
    } finally {
      setSaving(false);
    }
  };

  // Meta Official handlers
  const saveMetaCredentials = async (businessId: string, phoneNumberId: string, token: string) => {
    setSaving(true);
    try {
      const newSettings: WhatsAppSettings = {
        ...settings,
        credentials: {
          ...settings.credentials,
          meta_business_id: businessId,
          meta_phone_number_id: phoneNumberId,
          meta_token: token,
        },
        connected: true,
        last_connected_at: new Date().toISOString(),
      };
      await saveSettings(newSettings);
      toast.success('Credenciais Meta salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  };

  const isConnected = (): boolean => {
    const provider = settings.api_provider;
    const creds = settings.credentials || {};
    
    switch (provider) {
      case 'uazapi':
        return creds.uazapi_connected || false;
      case 'zapi':
        return creds.zapi_connected || false;
      case 'meta_oficial':
        return !!(creds.meta_business_id && creds.meta_token);
      default:
        return false;
    }
  };

  return {
    settings,
    loading,
    saving,
    testResult,
    isConnected: isConnected(),
    updateApiProvider,
    // Uazapi
    connectUazapi,
    disconnectUazapi,
    // Z-Api
    saveZapiCredentials,
    testZapiConnection,
    // Meta
    saveMetaCredentials,
  };
}
