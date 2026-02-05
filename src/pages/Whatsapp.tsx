 import { useState, useEffect, useMemo } from "react";
 import { Link } from "react-router-dom";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { ConversationList } from "@/components/whatsapp/ConversationList";
 import { ChatMessages } from "@/components/whatsapp/ChatMessages";
 import { ContactDetails } from "@/components/whatsapp/ContactDetails";
 import { InstanceStatusBanner } from "@/components/whatsapp/InstanceStatusBanner";
 import { useWhatsAppChat } from "@/hooks/useWhatsAppChat";
 import { useWhatsAppTags } from "@/hooks/useWhatsAppTags";
 import { Button } from "@/components/ui/button";
 import { Settings, MessageCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useCompany } from "@/hooks/useCompany";

export default function Whatsapp() {
   const { company } = useCompany();
  const {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation,
    instance,
    loading,
    sendingMessage,
    sendMessage,
  } = useWhatsAppChat();

   const { tags } = useWhatsAppTags();
   const [selectedTagFilter, setSelectedTagFilter] = useState("all");
   const [conversationTagsMap, setConversationTagsMap] = useState<Map<string, string[]>>(new Map());
 
   // Fetch all conversation tags for the company
   useEffect(() => {
     if (!company?.id || conversations.length === 0) return;
 
     async function fetchConversationTags() {
       const conversationIds = conversations.map((c) => c.id);
       const { data, error } = await supabase
         .from("whatsapp_conversation_tags")
         .select("conversation_id, tag_id")
         .in("conversation_id", conversationIds);
 
       if (error) {
         console.error("Error fetching conversation tags:", error);
         return;
       }
 
       const map = new Map<string, string[]>();
       for (const row of data || []) {
         const existing = map.get(row.conversation_id) || [];
         existing.push(row.tag_id);
         map.set(row.conversation_id, existing);
       }
       setConversationTagsMap(map);
     }
 
     fetchConversationTags();
   }, [company?.id, conversations]);
 
  const hasInstance = !!instance;
  const isConnected = instance?.status === "connected";

  return (
    <AppLayout title="WhatsApp">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Chat</h1>
        </div>
        {hasInstance && (
          <InstanceStatusBanner status={instance?.status || null} loading={loading} />
        )}
      </div>

      {/* No instance warning */}
      {!loading && !hasInstance && (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
          <div className="bg-muted/50 rounded-full p-6 mb-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">WhatsApp não conectado</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Para usar o chat, você precisa conectar seu WhatsApp nas configurações.
          </p>
          <Button asChild>
            <Link to="/configuracoes">
              <Settings className="h-4 w-4 mr-2" />
              Ir para Configurações
            </Link>
          </Button>
        </div>
      )}

      {/* Chat layout */}
      {hasInstance && (
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
          {/* Left: Conversation list */}
          <div className="col-span-3 bg-card rounded-xl border overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <h2 className="font-semibold text-sm">Conversas</h2>
            </div>
            <div className="h-[calc(100%-48px)]">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id || null}
                onSelect={setSelectedConversation}
                   tags={tags}
                   selectedTagFilter={selectedTagFilter}
                   onTagFilterChange={setSelectedTagFilter}
                   conversationTagsMap={conversationTagsMap}
              />
            </div>
          </div>

          {/* Center: Chat messages */}
          <div className="col-span-6 bg-card rounded-xl border overflow-hidden">
            <ChatMessages
              messages={messages}
              contactName={
                selectedConversation?.contact_name ||
                selectedConversation?.contact_phone ||
                ""
              }
              onSendMessage={sendMessage}
              sendingMessage={sendingMessage}
              instanceConnected={isConnected}
            />
          </div>

          {/* Right: Contact details */}
          <div className="col-span-3 bg-card rounded-xl border overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <h2 className="font-semibold text-sm">Contato</h2>
            </div>
            <div className="h-[calc(100%-48px)]">
              <ContactDetails conversation={selectedConversation} />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
