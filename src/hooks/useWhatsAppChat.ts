import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "@/hooks/use-toast";

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

interface Message {
  id: string;
  company_id: string;
  conversation_id: string;
  direction: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: string;
  sent_at: string;
  created_at: string;
}

interface WhatsAppInstance {
  id: string;
  company_id: string;
  instance_id: string | null;
  instance_token: string | null;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
}

export function useWhatsAppChat() {
  const { company } = useCompany();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch WhatsApp instance
  useEffect(() => {
    if (!company?.id) return;

    async function fetchInstance() {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("company_id", company!.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching instance:", error);
      }
      setInstance(data);
      setLoading(false);
    }

    fetchInstance();

    // Subscribe to instance changes
    const channel = supabase
      .channel("whatsapp-instance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_instances",
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setInstance(null);
          } else {
            setInstance(payload.new as WhatsAppInstance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

  // Fetch conversations
  useEffect(() => {
    if (!company?.id) return;

    async function fetchConversations() {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("company_id", company!.id)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        return;
      }
      setConversations(data || []);
    }

    fetchConversations();

    // Subscribe to conversation changes
    const channel = supabase
      .channel("whatsapp-conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setConversations((prev) => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setConversations((prev) =>
              prev
                .map((c) => (c.id === payload.new.id ? (payload.new as Conversation) : c))
                .sort((a, b) => 
                  new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
                )
            );
            // Update selected conversation if it's the one being updated
            if (selectedConversation?.id === payload.new.id) {
              setSelectedConversation(payload.new as Conversation);
            }
          } else if (payload.eventType === "DELETE") {
            setConversations((prev) => prev.filter((c) => c.id !== payload.old.id));
            if (selectedConversation?.id === payload.old.id) {
              setSelectedConversation(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, selectedConversation?.id]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", selectedConversation!.id)
        .order("sent_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }
      setMessages(data || []);
    }

    fetchMessages();

    // Subscribe to message changes
    const channel = supabase
      .channel(`whatsapp-messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  // Send message
  async function sendMessage(content: string) {
    if (!selectedConversation || !company || !instance) return;

    setSendingMessage(true);

    try {
      // Get company WhatsApp settings
      const whatsappSettings = company.whatsapp_settings as any;
      const apiProvider = whatsappSettings?.api_provider || "uazapi";

      // Prepare phone number (remove non-digits)
      const phone = selectedConversation.contact_phone.replace(/\D/g, "");

      // Send via WhatsApp API
      let apiSuccess = false;

      if (apiProvider === "uazapi" && instance.instance_id && instance.instance_token) {
        const baseUrl = whatsappSettings?.uazapi_base_url || "https://api.uazapi.com";
        const response = await fetch(`${baseUrl}/send-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${instance.instance_token}`,
          },
          body: JSON.stringify({
            instanceId: instance.instance_id,
            to: phone,
            message: content,
          }),
        });
        apiSuccess = response.ok;
      } else if (apiProvider === "zapi" && whatsappSettings?.zapi_instance_id && whatsappSettings?.zapi_token) {
        const response = await fetch(
          `https://api.z-api.io/instances/${whatsappSettings.zapi_instance_id}/token/${whatsappSettings.zapi_token}/send-text`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone,
              message: content,
            }),
          }
        );
        apiSuccess = response.ok;
      }

      // Save message to database
      const { error } = await supabase.from("whatsapp_messages").insert({
        company_id: company.id,
        conversation_id: selectedConversation.id,
        direction: "outbound",
        content,
        status: apiSuccess ? "sent" : "failed",
      });

      if (error) throw error;

      // Update conversation
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.id);

      if (!apiSuccess) {
        toast({
          title: "Aviso",
          description: "Mensagem salva mas pode não ter sido enviada via WhatsApp.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  }

  return {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation,
    instance,
    loading,
    sendingMessage,
    sendMessage,
  };
}
