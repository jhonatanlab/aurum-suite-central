import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  supplies: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  phone: string;
  email: string;
  supplies: string;
}

export function useSuppliers() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!company?.id,
  });

  const createSupplier = useMutation({
    mutationFn: async (formData: SupplierFormData) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          company_id: company.id,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          supplies: formData.supplies || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Fornecedor criado!',
        description: 'O fornecedor foi cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...formData }: SupplierFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          supplies: formData.supplies || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Fornecedor atualizado!',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Fornecedor removido!',
        description: 'O fornecedor foi excluído.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleSupplierStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  return {
    suppliers,
    activeSuppliers: suppliers.filter(s => s.active),
    isLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
  };
}
