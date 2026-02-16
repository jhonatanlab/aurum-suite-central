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

      // Check for plan limit in the result body (403 responses may still have data)
      if (result?.code === 'PLAN_USER_LIMIT' || result?.code === 'PLAN_MODULE_BLOCKED') {
        toast.error(result.error || 'Limite do plano atingido. Faça upgrade.');
        return { error: error || new Error(result.error), planLimit: true, planData: result };
      }

      if (error) {
        // Try to parse the response body from error context
        try {
          const context = (error as any)?.context;
          if (context instanceof Response) {
            const body = await context.json();
            if (body?.code === 'PLAN_USER_LIMIT' || body?.code === 'PLAN_MODULE_BLOCKED') {
              toast.error(body.error || 'Limite do plano atingido. Faça upgrade.');
              return { error, planLimit: true, planData: body };
            }
          }
        } catch { /* ignore parsing errors */ }
        throw error;
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success('Membro adicionado com sucesso!');
      await fetchMembers();
      return { error: null, planLimit: false };
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar membro');
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
