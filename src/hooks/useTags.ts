import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface Tag {
  id: string;
  name: string;
  color: string;
  company_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTags() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all tags for the company
  const tagsQuery = useQuery({
    queryKey: ["tags", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("company_id", company.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!company?.id,
  });

  // Fetch only active tags
  const activeTagsQuery = useQuery({
    queryKey: ["tags", company?.id, "active"],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("company_id", company.id)
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!company?.id,
  });

  // Create tag mutation
  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: name.trim(),
          color,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // Update tag mutation
  const updateTag = useMutation({
    mutationFn: async ({
      id,
      name,
      color,
      active,
    }: {
      id: string;
      name?: string;
      color?: string;
      active?: boolean;
    }) => {
      const updateData: Partial<Tag> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (color !== undefined) updateData.color = color;
      if (active !== undefined) updateData.active = active;

      const { data, error } = await supabase
        .from("tags")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // Delete tag mutation
  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // Get tag by ID helper
  const getTagById = (id: string): Tag | undefined => {
    return tagsQuery.data?.find((tag) => tag.id === id);
  };

  // Get multiple tags by IDs
  const getTagsByIds = (ids: string[]): Tag[] => {
    if (!tagsQuery.data) return [];
    return tagsQuery.data.filter((tag) => ids.includes(tag.id));
  };

  return {
    tags: tagsQuery.data ?? [],
    activeTags: activeTagsQuery.data ?? [],
    isLoading: tagsQuery.isLoading,
    isLoadingActive: activeTagsQuery.isLoading,
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagsByIds,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  };
}
