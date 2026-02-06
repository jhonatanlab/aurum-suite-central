import { useEffect, useRef, useState, ChangeEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Loader2, MessageCircle, Paperclip, X, Image, FileText, Mic, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  direction: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: string;
  sent_at: string;
  message_type?: string | null;
  media_mime_type?: string | null;
  file_name?: string | null;
  media_duration?: number | null;
  media_thumbnail?: string | null;
}

interface MediaAttachment {
  file: File;
  url: string;
  mimetype: string;
  type: "image" | "audio" | "video" | "document";
}

interface ChatMessagesProps {
  messages: Message[];
  contactName: string;
  onSendMessage: (content: string, mediaOptions?: { file?: File; mimetype: string; fileName?: string }) => void;
  sendingMessage: boolean;
  instanceConnected: boolean;
}

function getMediaTypeFromMime(mimetype: string): "image" | "audio" | "video" | "document" {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.startsWith("video/")) return "video";
  return "document";
}

function getMediaIcon(type: string) {
  switch (type) {
    case "image": return <Image className="h-4 w-4" />;
    case "audio": return <Mic className="h-4 w-4" />;
    case "video": return <Video className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

export function ChatMessages({
  messages,
  contactName,
  onSendMessage,
  sendingMessage,
  instanceConnected,
}: ChatMessagesProps) {
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    if ((!newMessage.trim() && !attachment) || sendingMessage || !instanceConnected) return;
    
    if (attachment) {
      // Pass the actual File object for upload to Supabase Storage
      onSendMessage(newMessage.trim(), {
        file: attachment.file,
        mimetype: attachment.mimetype,
        fileName: attachment.file.name,
      });
    } else {
      onSendMessage(newMessage.trim());
    }
    
    setNewMessage("");
    // Clean up local blob URL
    if (attachment) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(null);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileSelect(accept: string) {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    const mimetype = file.type;
    const type = getMediaTypeFromMime(mimetype);

    setAttachment({ file, url, mimetype, type });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAttachment() {
    if (attachment) {
      URL.revokeObjectURL(attachment.url);
      setAttachment(null);
    }
  }

  // Render message content with media
  function renderMessageMedia(message: Message) {
    const mediaUrl = message.media_url;
    if (!mediaUrl) return null;

    // Resolve the effective media type from multiple possible fields
    const resolvedType = message.message_type 
      || message.media_type 
      || (message.media_mime_type ? getMediaTypeFromMime(message.media_mime_type) : null)
      || "document";

    switch (resolvedType) {
      case "image":
        return (
          <div className="mb-2">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: 300 }}
              onClick={() => window.open(mediaUrl, "_blank")}
              onError={(e) => {
                // Fallback: show link if image fails to load
                const target = e.currentTarget;
                target.style.display = "none";
                const link = document.createElement("a");
                link.href = mediaUrl;
                link.target = "_blank";
                link.textContent = "📷 Ver imagem";
                link.className = "text-sm underline";
                target.parentElement?.appendChild(link);
              }}
            />
          </div>
        );
      case "audio":
        return (
          <div className="mb-2">
            <audio controls src={mediaUrl} className="max-w-full" />
          </div>
        );
      case "video":
        return (
          <div className="mb-2">
            <video controls src={mediaUrl} className="max-w-full rounded-lg" style={{ maxHeight: 300 }} />
          </div>
        );
      case "document":
      default:
        return (
          <div className="mb-2">
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm underline truncate">
                {message.file_name || "Ver documento"}
              </span>
            </a>
          </div>
        );
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

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
                  {renderMessageMedia(message)}
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
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

      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-card border">
            <div className="flex-shrink-0">
              {attachment.type === "image" ? (
                <img 
                  src={attachment.url} 
                  alt="Preview" 
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                  {getMediaIcon(attachment.type)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachment.file.size / 1024).toFixed(1)} KB • {attachment.type}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              onClick={removeAttachment}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          {/* Attachment button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 flex-shrink-0"
                disabled={!instanceConnected || sendingMessage}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => handleFileSelect("image/*")}>
                <Image className="h-4 w-4 mr-2" />
                Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileSelect("video/*")}>
                <Video className="h-4 w-4 mr-2" />
                Vídeo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileSelect("audio/*")}>
                <Mic className="h-4 w-4 mr-2" />
                Áudio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileSelect(".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar")}>
                <FileText className="h-4 w-4 mr-2" />
                Documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              instanceConnected
                ? attachment 
                  ? "Adicione uma legenda (opcional)..."
                  : "Digite uma mensagem..."
                : "WhatsApp desconectado"
            }
            disabled={!instanceConnected || sendingMessage}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !attachment) || sendingMessage || !instanceConnected}
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
