import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  direction: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: string;
  sent_at: string;
}

interface ChatMessagesProps {
  messages: Message[];
  contactName: string;
  onSendMessage: (content: string) => void;
  sendingMessage: boolean;
  instanceConnected: boolean;
}

export function ChatMessages({
  messages,
  contactName,
  onSendMessage,
  sendingMessage,
  instanceConnected,
}: ChatMessagesProps) {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    if (!newMessage.trim() || sendingMessage || !instanceConnected) return;
    onSendMessage(newMessage.trim());
    setNewMessage("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!contactName) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg">Selecione uma conversa</p>
        <p className="text-sm mt-1">Escolha uma conversa na lista para ver as mensagens</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <h3 className="font-semibold">{contactName}</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Nenhuma mensagem nesta conversa</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.direction === "outbound" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    message.direction === "outbound"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  {message.media_url && (
                    <div className="mb-2">
                      {message.media_type?.startsWith("image") ? (
                        <img
                          src={message.media_url}
                          alt="Mídia"
                          className="max-w-full rounded"
                        />
                      ) : message.media_type?.startsWith("audio") ? (
                        <audio controls src={message.media_url} className="max-w-full" />
                      ) : message.media_type?.startsWith("video") ? (
                        <video controls src={message.media_url} className="max-w-full rounded" />
                      ) : (
                        <a
                          href={message.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline"
                        >
                          Ver arquivo
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div
                    className={cn(
                      "text-[10px] mt-1 flex items-center gap-1",
                      message.direction === "outbound"
                        ? "text-primary-foreground/70 justify-end"
                        : "text-muted-foreground"
                    )}
                  >
                    <span>{format(new Date(message.sent_at), "HH:mm", { locale: ptBR })}</span>
                    {message.direction === "outbound" && message.status === "failed" && (
                      <span className="text-destructive">• Falhou</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              instanceConnected
                ? "Digite uma mensagem..."
                : "WhatsApp desconectado"
            }
            disabled={!instanceConnected || sendingMessage}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendingMessage || !instanceConnected}
            size="icon"
            className="h-11 w-11 flex-shrink-0"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
