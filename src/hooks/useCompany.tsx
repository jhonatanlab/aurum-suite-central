import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CrmSettings {
  enable_sales_column: boolean;
  auto_move_to_sales: boolean;
}

export interface WhatsAppCredentials {
  // Uazapi
  uazapi_session_id?: string;
  uazapi_connected?: boolean;
  uazapi_qr_code?: string;
  // Z-Api
  zapi_token?: string;
  zapi_instance?: string;
  zapi_connected?: boolean;
  // Meta Oficial
  meta_business_id?: string;
  meta_phone_number_id?: string;
  meta_token?: string;
  meta_webhook_active?: boolean;
}

export interface WhatsAppSettings {
  api_provider: 'uazapi' | 'zapi' | 'meta_oficial';
  api_history: Array<{
    provider: string;
    activated_at: string;
    deactivated_at?: string;
  }>;
  credentials?: WhatsAppCredentials;
  connected?: boolean;
  last_connected_at?: string;
}

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  status: string | null;
  plan: string | null;
  owner_uid: string | null;
  created_at: string | null;
  updated_at: string | null;
  crm_settings: CrmSettings | null;
  whatsapp_settings: WhatsAppSettings | null;
}

interface CompanyUser {
  id: string;
  user_id: string;
  company_id: string;
  role: string | null;
  created_at: string | null;
}

interface CompanyContextType {
  company: Company | null;
  companyUser: CompanyUser | null;
  loading: boolean;
  hasCompany: boolean;
  refetch: () => Promise<void>;
  createCompany: (name: string, cnpj?: string) => Promise<{ error: Error | null }>;
  updateCompany: (data: Partial<Company>) => Promise<{ error: Error | null }>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    if (!user) {
      setCompany(null);
      setCompanyUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Buscar vínculo do usuário com empresa
      const { data: companyUserData, error: cuError } = await supabase
        .from('company_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cuError) throw cuError;

      if (!companyUserData) {
        setCompanyUser(null);
        setCompany(null);
        setLoading(false);
        return;
      }

      setCompanyUser(companyUserData);

      // Buscar dados da empresa
      const { data: companyData, error: cError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyUserData.company_id)
        .single();

      if (cError) throw cError;

      setCompany({
        ...companyData,
        crm_settings: companyData.crm_settings as unknown as CrmSettings | null,
        whatsapp_settings: companyData.whatsapp_settings as unknown as WhatsAppSettings | null,
      });
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      setCompany(null);
      setCompanyUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Synchronously set loading=true when user changes to prevent race condition
    // where ProtectedRoute sees hasCompany=false before fetchCompany runs
    if (user) {
      setLoading(true);
    }
    fetchCompany();
  }, [user]);

  const createCompany = async (name: string, cnpj?: string) => {
    try {
      const { data, error } = await supabase.rpc('create_company_for_user', {
        _name: name,
        _cnpj: cnpj || null
      });

      if (error) throw error;

      // Auto-create WhatsApp instance for the new company
      if (data) {
        try {
          await supabase.functions.invoke('auto-create-whatsapp-instance', {
            body: { companyId: data, companyName: name }
          });
          console.log('[Company] WhatsApp instance auto-created for company:', data);
        } catch (whatsappError) {
          // Don't fail company creation if WhatsApp instance creation fails
          console.error('[Company] Failed to auto-create WhatsApp instance:', whatsappError);
        }
      }

      await fetchCompany();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateCompany = async (data: Partial<Company>) => {
    if (!company) {
      return { error: new Error('Nenhuma empresa encontrada') };
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update(data as any)
        .eq('id', company.id);

      if (error) throw error;

      await fetchCompany();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <CompanyContext.Provider 
      value={{ 
        company, 
        companyUser, 
        loading, 
        hasCompany: !!company,
        refetch: fetchCompany,
        createCompany,
        updateCompany
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
