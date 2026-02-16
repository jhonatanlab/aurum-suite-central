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
      const { data: result, error } = await supabase.functions.invoke(
        'create-team-member',
        {
          body: { ...data, company_id: company.id },
        }
      );

      if (error) {
        // Try to parse the response body for plan limit errors
        const context = error?.context;
        if (context instanceof Response) {
          const body = await context.json().catch(() => null);
          if (body?.code === 'PLAN_USER_LIMIT' || body?.code === 'PLAN_MODULE_BLOCKED') {
            toast.error(body.error || 'Limite do plano atingido. Faça upgrade.');
            return { error, planLimit: true, planData: body };
          }
        }
        throw error;
      }
      if (result?.error) {
        if (result?.code === 'PLAN_USER_LIMIT') {
          toast.error(result.error);
          return { error: new Error(result.error), planLimit: true, planData: result };
        }
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
