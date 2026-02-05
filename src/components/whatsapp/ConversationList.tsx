 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { MessageCircle, User, Filter, Tag } from "lucide-react";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { cn } from "@/lib/utils";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
   tags?: { id: string; name: string; color: string }[];
   selectedTagFilter?: string;
   onTagFilterChange?: (tagId: string) => void;
   conversationTagsMap?: Map<string, string[]>;
}

 export function ConversationList({
   conversations,
   selectedId,
   onSelect,
   tags = [],
   selectedTagFilter = "all",
   onTagFilterChange,
   conversationTagsMap = new Map(),
 }: ConversationListProps) {
  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, "HH:mm", { locale: ptBR });
    } else if (diffDays === 1) {
      return "Ontem";
    } else if (diffDays < 7) {
      return format(date, "EEEE", { locale: ptBR });
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    }
  }

   // Filter conversations by tag
   const filteredConversations = conversations.filter((conv) => {
     if (selectedTagFilter === "all") return true;
     if (selectedTagFilter === "none") {
       const convTags = conversationTagsMap.get(conv.id) || [];
       return convTags.length === 0;
     }
     const convTags = conversationTagsMap.get(conv.id) || [];
     return convTags.includes(selectedTagFilter);
   });
 
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm text-center">Nenhuma conversa ainda</p>
        <p className="text-xs text-center mt-1">
          As conversas aparecerão aqui quando você receber mensagens
        </p>
      </div>
    );
  }

  return (
     <div className="h-full flex flex-col">
       {/* Tag Filter */}
       {onTagFilterChange && (
         <div className="p-2 border-b">
           <Select value={selectedTagFilter} onValueChange={onTagFilterChange}>
             <SelectTrigger className="h-8 text-xs">
               <Filter className="h-3 w-3 mr-1" />
               <SelectValue placeholder="Filtrar" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todas</SelectItem>
               <SelectItem value="none">Sem tag</SelectItem>
               {tags.map((tag) => (
                 <SelectItem key={tag.id} value={tag.id}>
                   <div className="flex items-center gap-2">
                     <span
                       className="h-2 w-2 rounded-full"
                       style={{ backgroundColor: tag.color }}
                     />
                     {tag.name}
                   </div>
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
       )}
 
       <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
         {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={cn(
              "w-full p-3 text-left hover:bg-muted/50 transition-colors",
              selectedId === conversation.id && "bg-muted"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {conversation.contact_name || conversation.contact_phone}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDate(conversation.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.last_message || "Sem mensagens"}
                  </p>
                  {conversation.unread_count > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
               {/* Show tags as small dots */}
               {(conversationTagsMap.get(conversation.id)?.length ?? 0) > 0 && (
                 <div className="flex gap-0.5 mt-1">
                   {conversationTagsMap.get(conversation.id)?.slice(0, 3).map((tagId) => {
                     const tag = tags.find((t) => t.id === tagId);
                     return tag ? (
                       <span
                         key={tagId}
                         className="h-1.5 w-1.5 rounded-full"
                         style={{ backgroundColor: tag.color }}
                       />
                     ) : null;
                   })}
                   {(conversationTagsMap.get(conversation.id)?.length ?? 0) > 3 && (
                     <span className="text-[8px] text-muted-foreground ml-0.5">
                       +{(conversationTagsMap.get(conversation.id)?.length ?? 0) - 3}
                     </span>
                   )}
                 </div>
               )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
     </div>
  );
}
