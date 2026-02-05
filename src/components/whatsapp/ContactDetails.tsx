 import { useState, useEffect } from "react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { User, Phone, Clock, Tag, Plus, X, Check, Link2, ExternalLink, UserPlus, Search, Loader2 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { useWhatsAppTags } from "@/hooks/useWhatsAppTags";
 import { useCompany } from "@/hooks/useCompany";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  company_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
   crm_contact_id?: string | null;
}

 interface Lead {
   id: string;
   name: string;
   phone: string | null;
   email: string | null;
   status: string | null;
 }
 
interface ContactDetailsProps {
  conversation: Conversation | null;
   onConversationUpdate?: () => void;
}

 const TAG_COLORS = [
   "#EF4444", // red
   "#F97316", // orange
   "#EAB308", // yellow
   "#22C55E", // green
   "#14B8A6", // teal
   "#3B82F6", // blue
   "#8B5CF6", // violet
   "#EC4899", // pink
   "#6B7280", // gray
 ];
 
 export function ContactDetails({ conversation, onConversationUpdate }: ContactDetailsProps) {
   const navigate = useNavigate();
   const { company } = useCompany();
   const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
   const [showCreateTag, setShowCreateTag] = useState(false);
   const [newTagName, setNewTagName] = useState("");
   const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

   // CRM integration state
   const [crmModalOpen, setCrmModalOpen] = useState(false);
   const [crmSearchQuery, setCrmSearchQuery] = useState("");
   const [crmLeads, setCrmLeads] = useState<Lead[]>([]);
   const [crmLoading, setCrmLoading] = useState(false);
   const [linkedLead, setLinkedLead] = useState<Lead | null>(null);
   const [creatingLead, setCreatingLead] = useState(false);
 
   const {
     tags,
     appliedTags,
     appliedTagIds,
     createTag,
     addTagToConversation,
     removeTagFromConversation,
   } = useWhatsAppTags(conversation?.id);
 
   const handleAddTag = async (tagId: string) => {
     if (!conversation) return;
     try {
       await addTagToConversation.mutateAsync({ tagId, convId: conversation.id });
       toast.success("Tag adicionada");
     } catch {
       toast.error("Erro ao adicionar tag");
     }
   };
 
   const handleRemoveTag = async (tagId: string) => {
     if (!conversation) return;
     try {
       await removeTagFromConversation.mutateAsync({ tagId, convId: conversation.id });
       toast.success("Tag removida");
     } catch {
       toast.error("Erro ao remover tag");
     }
   };
 
   const handleCreateTag = async () => {
     if (!newTagName.trim()) return;
     try {
       const newTag = await createTag.mutateAsync({ name: newTagName, color: newTagColor });
       if (conversation) {
         await addTagToConversation.mutateAsync({ tagId: newTag.id, convId: conversation.id });
       }
       setNewTagName("");
       setNewTagColor(TAG_COLORS[0]);
       setShowCreateTag(false);
       toast.success("Tag criada e aplicada");
     } catch {
       toast.error("Erro ao criar tag");
     }
   };

   // Fetch linked lead when conversation changes
   useEffect(() => {
     if (!conversation?.crm_contact_id) {
       setLinkedLead(null);
       return;
     }
 
     async function fetchLinkedLead() {
       const { data, error } = await supabase
         .from("leads")
         .select("id, name, phone, email, status")
         .eq("id", conversation!.crm_contact_id!)
         .single();
 
       if (!error && data) {
         setLinkedLead(data);
       }
     }
 
     fetchLinkedLead();
   }, [conversation?.crm_contact_id]);
 
   // Search CRM leads
   const searchCrmLeads = async (query: string) => {
     if (!company?.id) return;
     setCrmLoading(true);
 
     try {
       let queryBuilder = supabase
         .from("leads")
         .select("id, name, phone, email, status")
         .eq("company_id", company.id)
         .order("created_at", { ascending: false })
         .limit(20);
 
       if (query.trim()) {
         queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
       }
 
       const { data, error } = await queryBuilder;
 
       if (error) throw error;
       setCrmLeads(data || []);
     } catch (error) {
       console.error("Error searching leads:", error);
       toast.error("Erro ao buscar contatos");
     } finally {
       setCrmLoading(false);
     }
   };
 
   // Link conversation to CRM lead
   const linkToCrm = async (leadId: string) => {
     if (!conversation) return;
 
     try {
       const { error } = await supabase
         .from("whatsapp_conversations")
         .update({ crm_contact_id: leadId })
         .eq("id", conversation.id);
 
       if (error) throw error;
 
       toast.success("Conversa vinculada ao CRM");
       setCrmModalOpen(false);
       onConversationUpdate?.();
     } catch (error) {
       console.error("Error linking to CRM:", error);
       toast.error("Erro ao vincular ao CRM");
     }
   };
 
   // Create new lead and link
   const createAndLinkLead = async () => {
     if (!conversation || !company?.id) return;
     setCreatingLead(true);
 
     try {
       // Create lead
       const { data: newLead, error: createError } = await supabase
         .from("leads")
         .insert({
           company_id: company.id,
           name: conversation.contact_name || `WhatsApp ${conversation.contact_phone}`,
           phone: conversation.contact_phone,
           source: "whatsapp",
           status: "new",
         })
         .select("id")
         .single();
 
       if (createError) throw createError;
 
       // Link to conversation
       const { error: linkError } = await supabase
         .from("whatsapp_conversations")
         .update({ crm_contact_id: newLead.id })
         .eq("id", conversation.id);
 
       if (linkError) throw linkError;
 
       toast.success("Lead criado e vinculado");
       onConversationUpdate?.();
     } catch (error) {
       console.error("Error creating lead:", error);
       toast.error("Erro ao criar lead");
     } finally {
       setCreatingLead(false);
     }
   };
 
   // Open CRM modal and load leads
   const openCrmModal = () => {
     setCrmModalOpen(true);
     setCrmSearchQuery("");
     searchCrmLeads("");
   };
 
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <User className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm text-center">Selecione uma conversa</p>
        <p className="text-xs text-center mt-1">
          Os dados do contato aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Avatar */}
      <div className="flex flex-col items-center py-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-center">
          {conversation.contact_name || "Contato"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {conversation.contact_phone}
        </p>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">
                {conversation.contact_name || "Não informado"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm font-medium">{conversation.contact_phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Última interação</p>
              <p className="text-sm font-medium">
                {conversation.last_message_at
                  ? format(new Date(conversation.last_message_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })
                  : "Sem interação"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

       {/* CRM Integration Section */}
       <Card>
         <CardHeader className="pb-3">
           <CardTitle className="text-sm font-medium flex items-center gap-2">
             <Link2 className="h-4 w-4" />
             CRM
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
           {linkedLead ? (
             <>
               <div className="p-3 bg-muted/50 rounded-lg">
                 <p className="font-medium text-sm">{linkedLead.name}</p>
                 {linkedLead.email && (
                   <p className="text-xs text-muted-foreground">{linkedLead.email}</p>
                 )}
                 {linkedLead.status && (
                   <Badge variant="outline" className="mt-1 text-xs">
                     {linkedLead.status}
                   </Badge>
                 )}
               </div>
               <Button
                 variant="outline"
                 size="sm"
                 className="w-full"
                 onClick={() => navigate("/crm")}
               >
                 <ExternalLink className="h-4 w-4 mr-1" />
                 Abrir no CRM
               </Button>
             </>
           ) : (
             <>
               <p className="text-xs text-muted-foreground">
                 Este contato não está vinculado ao CRM
               </p>
               <div className="flex flex-col gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   className="w-full"
                   onClick={openCrmModal}
                 >
                   <Link2 className="h-4 w-4 mr-1" />
                   Vincular ao CRM
                 </Button>
                 <Button
                   variant="default"
                   size="sm"
                   className="w-full"
                   onClick={createAndLinkLead}
                   disabled={creatingLead}
                 >
                   {creatingLead ? (
                     <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                   ) : (
                     <UserPlus className="h-4 w-4 mr-1" />
                   )}
                   Criar Lead no CRM
                 </Button>
               </div>
             </>
           )}
         </CardContent>
       </Card>
 
       {/* Tags Section */}
       <Card>
         <CardHeader className="pb-3">
           <CardTitle className="text-sm font-medium flex items-center gap-2">
             <Tag className="h-4 w-4" />
             Tags
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
           {/* Applied Tags */}
           <div className="flex flex-wrap gap-1.5">
             {appliedTags.length === 0 && (
               <p className="text-xs text-muted-foreground">Nenhuma tag aplicada</p>
             )}
             {appliedTags.map((tag) => (
               <Badge
                 key={tag.id}
                 variant="secondary"
                 className="text-xs gap-1 pr-1"
                 style={{ backgroundColor: tag.color + "20", borderColor: tag.color, color: tag.color }}
               >
                 {tag.name}
                 <button
                   onClick={() => handleRemoveTag(tag.id)}
                   className="ml-0.5 hover:bg-black/10 rounded p-0.5"
                 >
                   <X className="h-3 w-3" />
                 </button>
               </Badge>
             ))}
           </div>
 
           {/* Add Tag Button */}
           <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
             <PopoverTrigger asChild>
               <Button variant="outline" size="sm" className="w-full">
                 <Plus className="h-4 w-4 mr-1" />
                 Adicionar Tag
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-56 p-2" align="start">
               {!showCreateTag ? (
                 <div className="space-y-1">
                   {tags.filter((t) => !appliedTagIds.has(t.id)).length === 0 && (
                     <p className="text-xs text-muted-foreground text-center py-2">
                       Nenhuma tag disponível
                     </p>
                   )}
                   {tags
                     .filter((t) => !appliedTagIds.has(t.id))
                     .map((tag) => (
                       <button
                         key={tag.id}
                         onClick={() => {
                           handleAddTag(tag.id);
                           setTagPopoverOpen(false);
                         }}
                         className="w-full flex items-center gap-2 p-2 text-sm rounded hover:bg-muted text-left"
                       >
                         <span
                           className="h-3 w-3 rounded-full flex-shrink-0"
                           style={{ backgroundColor: tag.color }}
                         />
                         {tag.name}
                       </button>
                     ))}
                   <button
                     onClick={() => setShowCreateTag(true)}
                     className="w-full flex items-center gap-2 p-2 text-sm rounded hover:bg-muted text-left text-primary"
                   >
                     <Plus className="h-3 w-3" />
                     Criar nova tag
                   </button>
                 </div>
               ) : (
                 <div className="space-y-3">
                   <Input
                     placeholder="Nome da tag"
                     value={newTagName}
                     onChange={(e) => setNewTagName(e.target.value)}
                     className="h-8 text-sm"
                   />
                   <div className="flex flex-wrap gap-1">
                     {TAG_COLORS.map((color) => (
                       <button
                         key={color}
                         onClick={() => setNewTagColor(color)}
                         className="h-6 w-6 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: color }}
                       >
                         {newTagColor === color && (
                           <Check className="h-3 w-3 text-white" />
                         )}
                       </button>
                     ))}
                   </div>
                   <div className="flex gap-2">
                     <Button
                       variant="ghost"
                       size="sm"
                       className="flex-1"
                       onClick={() => {
                         setShowCreateTag(false);
                         setNewTagName("");
                       }}
                     >
                       Cancelar
                     </Button>
                     <Button
                       size="sm"
                       className="flex-1"
                       onClick={handleCreateTag}
                       disabled={!newTagName.trim() || createTag.isPending}
                     >
                       Criar
                     </Button>
                   </div>
                 </div>
               )}
             </PopoverContent>
           </Popover>
         </CardContent>
       </Card>

       {/* CRM Search Modal */}
       <Dialog open={crmModalOpen} onOpenChange={setCrmModalOpen}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Vincular ao CRM</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Buscar por nome, telefone ou email..."
                 value={crmSearchQuery}
                 onChange={(e) => {
                   setCrmSearchQuery(e.target.value);
                   searchCrmLeads(e.target.value);
                 }}
                 className="pl-9"
               />
             </div>
             <ScrollArea className="h-64">
               {crmLoading ? (
                 <div className="flex items-center justify-center py-8">
                   <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                 </div>
               ) : crmLeads.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-8">
                   Nenhum contato encontrado
                 </p>
               ) : (
                 <div className="space-y-1">
                   {crmLeads.map((lead) => (
                     <button
                       key={lead.id}
                       onClick={() => linkToCrm(lead.id)}
                       className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left"
                     >
                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                         <User className="h-4 w-4 text-primary" />
                       </div>
                       <div className="min-w-0 flex-1">
                         <p className="font-medium text-sm truncate">{lead.name}</p>
                         <p className="text-xs text-muted-foreground truncate">
                           {lead.phone || lead.email || "Sem contato"}
                         </p>
                       </div>
                       {lead.status && (
                         <Badge variant="outline" className="text-xs flex-shrink-0">
                           {lead.status}
                         </Badge>
                       )}
                     </button>
                   ))}
                 </div>
               )}
             </ScrollArea>
           </div>
         </DialogContent>
       </Dialog>
    </div>
  );
}
