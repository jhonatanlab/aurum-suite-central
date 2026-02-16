import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  name?: string;
}

export function useTeamMembers() {
  const { company } = useCompany();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const { data: result, error: fetchError } = await supabase.functions.invoke('list-team-members?company_id=' + company.id);

      if (fetchError) throw fetchError;
      setMembers(result?.members || []);
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [company?.id]);

  const createMember = async (data: {
    name: string;
    email: string;
    password: string;
    role: 'vendedor' | 'gerente';
  }) => {
    if (!company) return { error: new Error('Sem empresa'), planLimit: false };

    try {
      const response = await supabase.functions.invoke(
        'create-team-member',
        {
          body: { ...data, company_id: company.id },
        }
      );

      const result = response.data;
      const error = response.error;

      // Check for plan limit codes in either result or error
      const isPlanLimit = (obj: any) =>
        obj?.code === 'PLAN_USER_LIMIT' || obj?.code === 'PLAN_MODULE_BLOCKED';

      if (isPlanLimit(result)) {
        return { error: error || new Error(result.error), planLimit: true, planData: result };
      }

      if (error) {
        // Try to extract plan limit info from error context
        let errorBody: any = null;
        try {
          const context = (error as any)?.context;
          if (context instanceof Response) {
            errorBody = await context.json();
          }
        } catch { /* body already consumed or not JSON */ }

        // Also check the error message itself for plan limit keywords
        const errorMsg = (error as any)?.message || String(error);
        if (isPlanLimit(errorBody)) {
          return { error, planLimit: true, planData: errorBody };
        }
        if (errorMsg.includes('PLAN_USER_LIMIT') || errorMsg.includes('Limite de')) {
          return { error, planLimit: true, planData: { error: errorMsg } };
        }

        toast.error(errorBody?.error || errorMsg || 'Erro ao criar membro');
        return { error, planLimit: false };
      }

      if (result?.error) {
        toast.error(result.error);
        return { error: new Error(result.error), planLimit: false };
      }

      toast.success('Membro adicionado com sucesso!');
      await fetchMembers();
      return { error: null, planLimit: false };
    } catch (err: any) {
      // Catch-all: check if the stringified error contains plan limit info
      const msg = err?.message || String(err);
      if (msg.includes('PLAN_USER_LIMIT') || msg.includes('Limite de')) {
        return { error: err, planLimit: true, planData: { error: msg } };
      }
      toast.error(msg || 'Erro ao criar membro');
      return { error: err, planLimit: false };
    }
  };

  const removeMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
      toast.success('Membro removido');
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover membro');
    }
  };

  return { members, loading, createMember, removeMember, refetch: fetchMembers };
}
