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

interface WhatsAppSettings {
  send_message_url: string;
}

export function useWhatsAppChat() {
  const { company } = useCompany();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch WhatsApp instance and settings
  useEffect(() => {
    if (!company?.id) return;

    async function fetchInstanceAndSettings() {
      // Fetch instance
      const { data: instanceData, error: instanceError } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("company_id", company!.id)
        .maybeSingle();

      if (instanceError) {
        console.error("Error fetching instance:", instanceError);
      }
      setInstance(instanceData);

      // Fetch WhatsApp settings (global n8n config)
      const { data: settingsData } = await supabase
        .from("whatsapp_settings")
        .select("send_message_url")
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        setWhatsappSettings(settingsData);
      }

      setLoading(false);
    }

    fetchInstanceAndSettings();

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

  // Fetch conversations (grouped by phone_number, prioritizing records with contact_name)
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

      // Normalize phone number for grouping (handles variations like 558388907220 vs 5583988907220)
      const normalizePhone = (phone: string): string => {
        const digits = phone.replace(/\D/g, "");
        // Brazilian numbers: extract last 8-9 digits (local number without country/area code variations)
        // This handles cases where the 9th digit is missing or present
        if (digits.length >= 10) {
          // Get the last 8 digits as the core identifier
          return digits.slice(-8);
        }
        return digits;
      };

      // Group by normalized phone_number, prioritizing records with contact_name
      const groupedByPhone = new Map<string, Conversation>();
      const phoneKeyMap = new Map<string, string>(); // normalized -> original
      
      for (const conv of (data || []) as Conversation[]) {
        const normalizedPhone = normalizePhone(conv.contact_phone);
        const existingKey = phoneKeyMap.get(normalizedPhone);
        const existing = existingKey ? groupedByPhone.get(existingKey) : undefined;
        
        if (!existing) {
          phoneKeyMap.set(normalizedPhone, conv.contact_phone);
          groupedByPhone.set(conv.contact_phone, conv);
        } else {
          // Prioritize the one with contact_name
          const existingHasName = existing.contact_name && existing.contact_name.trim() !== "";
          const newHasName = conv.contact_name && conv.contact_name.trim() !== "";
          
          if (newHasName && !existingHasName) {
            // New has name, existing doesn't - use new but keep most recent message
            const merged = {
              ...conv,
              last_message: new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0) 
                ? conv.last_message 
                : existing.last_message,
              last_message_at: new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0)
                ? conv.last_message_at
                : existing.last_message_at,
              unread_count: conv.unread_count + existing.unread_count,
            };
            // Remove old key and add with new phone
            groupedByPhone.delete(existingKey!);
            phoneKeyMap.set(normalizedPhone, conv.contact_phone);
            groupedByPhone.set(conv.contact_phone, merged);
          } else if (!newHasName && existingHasName) {
            // Existing has name, keep it but update message if newer
            if (new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0)) {
              const merged = {
                ...existing,
                last_message: conv.last_message,
                last_message_at: conv.last_message_at,
                unread_count: conv.unread_count + existing.unread_count,
              };
              groupedByPhone.set(existingKey!, merged);
            } else {
              existing.unread_count += conv.unread_count;
            }
          } else {
            // Both have name or both don't - keep most recent
            if (new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0)) {
              conv.unread_count += existing.unread_count;
              groupedByPhone.delete(existingKey!);
              phoneKeyMap.set(normalizedPhone, conv.contact_phone);
              groupedByPhone.set(conv.contact_phone, conv);
            } else {
              existing.unread_count += conv.unread_count;
            }
          }
        }
      }

      // Convert to array and sort by last_message_at
      const grouped = Array.from(groupedByPhone.values()).sort(
        (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
      );

      setConversations(grouped);
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
      // Prepare phone number (remove non-digits)
      const phone = selectedConversation.contact_phone.replace(/\D/g, "");

      let apiSuccess = false;
      let errorMessage = "";

      // Try n8n-proxy if settings available, fallback to uazapi-send-message
      if (whatsappSettings?.send_message_url) {
        // Send via n8n-proxy with number and text params
        const { data, error: sendError } = await supabase.functions.invoke('n8n-proxy', {
          body: {
            action: "send-message",
            endpoint_url: whatsappSettings.send_message_url,
            payload: {
              company_id: company.id,
              instance_id: instance.instance_id,
              number: phone,
              text: content
            }
          }
        });

        apiSuccess = !sendError && data?.success;
        if (!apiSuccess) {
          const detailsMsg = (data as any)?.details?.message;
          const upstreamStatus = (data as any)?.status;
          errorMessage =
            detailsMsg
              ? `n8n (${upstreamStatus ?? "erro"}): ${detailsMsg}`
              : (data?.error || sendError?.message || "Erro ao enviar mensagem");
        }
      } else {
        // Fallback to uazapi-send-message
        const { data, error: sendError } = await supabase.functions.invoke('uazapi-send-message', {
          body: {
            companyId: company.id,
            phone,
            message: content,
          }
        });

        apiSuccess = !sendError && data?.success;
        if (!apiSuccess) {
          errorMessage = data?.error || sendError?.message || "Erro ao enviar mensagem";
        }
      }

      // Save message to database
      const { error } = await supabase.from("whatsapp_messages").insert({
        company_id: company.id,
        conversation_id: selectedConversation.id,
        direction: "outbound",
        content,
        status: apiSuccess ? "sent" : "failed",
        sent_at: new Date().toISOString(),
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
          description: errorMessage || "Mensagem salva mas pode não ter sido enviada via WhatsApp.",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      const message = error instanceof Error ? error.message : "Não foi possível enviar a mensagem.";
      toast({
        title: "Erro ao enviar mensagem",
        description: message,
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
