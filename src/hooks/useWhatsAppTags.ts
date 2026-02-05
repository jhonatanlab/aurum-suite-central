 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useCompany } from "@/hooks/useCompany";
 
 export interface WhatsAppTag {
   id: string;
   company_id: string;
   name: string;
   color: string;
   created_at: string;
 }
 
 export interface ConversationTag {
   id: string;
   conversation_id: string;
   tag_id: string;
   created_at: string;
 }
 
 export function useWhatsAppTags(conversationId?: string) {
   const { company } = useCompany();
   const queryClient = useQueryClient();
 
   // Fetch all tags for the company
   const tagsQuery = useQuery({
     queryKey: ["whatsapp-tags", company?.id],
     queryFn: async () => {
       if (!company?.id) return [];
 
       const { data, error } = await supabase
         .from("whatsapp_tags")
         .select("*")
         .eq("company_id", company.id)
         .order("name", { ascending: true });
 
       if (error) throw error;
       return data as WhatsAppTag[];
     },
     enabled: !!company?.id,
   });
 
   // Fetch tags for a specific conversation
   const conversationTagsQuery = useQuery({
     queryKey: ["whatsapp-conversation-tags", conversationId],
     queryFn: async () => {
       if (!conversationId) return [];
 
       const { data, error } = await supabase
         .from("whatsapp_conversation_tags")
         .select("*, whatsapp_tags(*)")
         .eq("conversation_id", conversationId);
 
       if (error) throw error;
       return data as (ConversationTag & { whatsapp_tags: WhatsAppTag })[];
     },
     enabled: !!conversationId,
   });
 
   // Create tag mutation
   const createTag = useMutation({
     mutationFn: async ({ name, color }: { name: string; color: string }) => {
       if (!company?.id) throw new Error("Empresa não encontrada");
 
       const { data, error } = await supabase
         .from("whatsapp_tags")
         .insert({
           name: name.trim(),
           color,
           company_id: company.id,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data as WhatsAppTag;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["whatsapp-tags"] });
     },
   });
 
   // Add tag to conversation
   const addTagToConversation = useMutation({
     mutationFn: async ({ tagId, convId }: { tagId: string; convId: string }) => {
       const { data, error } = await supabase
         .from("whatsapp_conversation_tags")
         .insert({
           conversation_id: convId,
           tag_id: tagId,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-tags"] });
     },
   });
 
   // Remove tag from conversation
   const removeTagFromConversation = useMutation({
     mutationFn: async ({ tagId, convId }: { tagId: string; convId: string }) => {
       const { error } = await supabase
         .from("whatsapp_conversation_tags")
         .delete()
         .eq("conversation_id", convId)
         .eq("tag_id", tagId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-tags"] });
     },
   });
 
   // Delete tag
   const deleteTag = useMutation({
     mutationFn: async (tagId: string) => {
       const { error } = await supabase
         .from("whatsapp_tags")
         .delete()
         .eq("id", tagId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["whatsapp-tags"] });
       queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-tags"] });
     },
   });
 
   // Get applied tags for current conversation
   const appliedTags = conversationTagsQuery.data?.map((ct) => ct.whatsapp_tags) ?? [];
   const appliedTagIds = new Set(appliedTags.map((t) => t.id));
 
   return {
     tags: tagsQuery.data ?? [],
     appliedTags,
     appliedTagIds,
     isLoading: tagsQuery.isLoading,
     isLoadingConversationTags: conversationTagsQuery.isLoading,
     createTag,
     addTagToConversation,
     removeTagFromConversation,
     deleteTag,
     refetch: () => {
       queryClient.invalidateQueries({ queryKey: ["whatsapp-tags"] });
       queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-tags"] });
     },
   };
 }