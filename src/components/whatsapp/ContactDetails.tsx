 import { useState } from "react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { User, Phone, Clock, Tag, Plus, X, Check } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover";
 import { useWhatsAppTags } from "@/hooks/useWhatsAppTags";
 import { toast } from "sonner";

interface Conversation {
  id: string;
  company_id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

interface ContactDetailsProps {
  conversation: Conversation | null;
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
 
export function ContactDetails({ conversation }: ContactDetailsProps) {
   const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
   const [showCreateTag, setShowCreateTag] = useState(false);
   const [newTagName, setNewTagName] = useState("");
   const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
 
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
    </div>
  );
}
