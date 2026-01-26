import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MessageCircle, 
  Users, 
  Users2, 
  Filter,
  Image,
  FileAudio,
  Video,
  Paperclip,
  Clock,
  Send,
  AlertTriangle,
  CalendarIcon,
  X,
  Upload,
  Loader2,
  Trash2
} from "lucide-react";
import { Campaign, CampaignFormData } from "@/hooks/useCampaigns";
import { useTags } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface NewCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CampaignFormData) => void;
  campaign?: Campaign | null;
  isLoading?: boolean;
}

const leadStatuses = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Qualificado" },
  { value: "negotiating", label: "Negociação" },
  { value: "won", label: "Convertido" },
  { value: "lost", label: "Perdido" },
];

const leadSources = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Website" },
  { value: "indication", label: "Indicação" },
  { value: "manual", label: "Manual" },
];

export function NewCampaignModal({ open, onClose, onSave, campaign, isLoading }: NewCampaignModalProps) {
  const { tags } = useTags();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"clients" | "resellers">("clients");
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [speedRange, setSpeedRange] = useState([10, 30]);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Filtros CRM
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title || "");
      setMessage(campaign.message || "");
      setTargetType((campaign.target_type as "clients" | "resellers") || "clients");
      setSpeedRange([campaign.send_speed_min || 10, campaign.send_speed_max || 30]);
      setMediaType(campaign.media_type || null);
      setMediaUrl(campaign.media_url || null);
      
      if (campaign.scheduled_at) {
        setSendMode("scheduled");
        const date = new Date(campaign.scheduled_at);
        setScheduledDate(date);
        setScheduledTime(format(date, "HH:mm"));
      }
      
      const filters = campaign.target_filters as Record<string, unknown> || {};
      setFilterStatus((filters.status as string[]) || []);
      setFilterSource((filters.source as string[]) || []);
      setFilterTags((filters.tags as string[]) || []);
    } else {
      resetForm();
    }
  }, [campaign, open]);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setTargetType("clients");
    setSendMode("now");
    setScheduledDate(undefined);
    setScheduledTime("09:00");
    setSpeedRange([10, 30]);
    setMediaType(null);
    setMediaUrl(null);
    setMediaFileName(null);
    setFilterStatus([]);
    setFilterSource([]);
    setFilterTags([]);
  };

  const handleFileUpload = async (file: File, type: string) => {
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `campaigns/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(filePath);

      setMediaType(type);
      setMediaUrl(publicUrl);
      setMediaFileName(file.name);
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = async () => {
    if (mediaUrl) {
      try {
        // Extract file path from URL
        const url = new URL(mediaUrl);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('campaign-media') + 1).join('/');
        
        if (filePath) {
          await supabase.storage
            .from('campaign-media')
            .remove([filePath]);
        }
      } catch (error) {
        console.error("Error removing file:", error);
      }
    }
    
    setMediaType(null);
    setMediaUrl(null);
    setMediaFileName(null);
  };

  const handleMediaButtonClick = (type: string, inputRef: React.RefObject<HTMLInputElement>) => {
    if (mediaType === type) {
      handleRemoveMedia();
    } else {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
    // Reset input
    e.target.value = '';
  };

  const handleSubmit = (saveAsDraft: boolean) => {
    let scheduledAt: string | undefined;
    
    if (sendMode === "scheduled" && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const dateWithTime = new Date(scheduledDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      scheduledAt = dateWithTime.toISOString();
    }

    const formData: CampaignFormData = {
      title,
      message,
      channel: "whatsapp",
      target_type: targetType,
      target_filters: {
        status: filterStatus,
        source: filterSource,
        tags: filterTags,
      },
      media_type: mediaType || undefined,
      media_url: mediaUrl || undefined,
      send_speed_min: speedRange[0],
      send_speed_max: speedRange[1],
      scheduled_at: scheduledAt,
      status: saveAsDraft ? "draft" : (sendMode === "scheduled" ? "scheduled" : "draft"),
    };

    onSave(formData);
  };

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const insertParameter = (param: string) => {
    setMessage(prev => prev + ` {{${param}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {campaign ? "Editar Campanha" : "Nova Campanha"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome da campanha */}
          <div className="space-y-2">
            <Label htmlFor="title">Nome da Campanha</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Promoção de Verão"
              className="bg-background border-border"
            />
          </div>

          {/* Canal */}
          <div className="space-y-2">
            <Label>Canal</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">WhatsApp</span>
              <Badge variant="secondary" className="ml-auto">Único disponível</Badge>
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              className="min-h-[120px] bg-background border-border"
            />
            
            {/* Parâmetros */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Parâmetros:</span>
              {["nome", "telefone", "email"].map((param) => (
                <Button
                  key={param}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertParameter(param)}
                  className="h-6 text-xs"
                >
                  {`{{${param}}}`}
                </Button>
              ))}
            </div>

            {/* Mídia - Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "image")}
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "audio")}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "video")}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => handleFileChange(e, "document")}
            />

            {/* Mídia buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={mediaType === "image" ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleMediaButtonClick("image", imageInputRef)}
                disabled={isUploading}
              >
                {isUploading && mediaType === "image" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Image className="h-4 w-4 mr-1" />
                )}
                Imagem
              </Button>
              <Button
                type="button"
                variant={mediaType === "audio" ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleMediaButtonClick("audio", audioInputRef)}
                disabled={isUploading}
              >
                {isUploading && mediaType === "audio" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileAudio className="h-4 w-4 mr-1" />
                )}
                Áudio
              </Button>
              <Button
                type="button"
                variant={mediaType === "video" ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleMediaButtonClick("video", videoInputRef)}
                disabled={isUploading}
              >
                {isUploading && mediaType === "video" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Video className="h-4 w-4 mr-1" />
                )}
                Vídeo
              </Button>
              <Button
                type="button"
                variant={mediaType === "document" ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleMediaButtonClick("document", documentInputRef)}
                disabled={isUploading}
              >
                {isUploading && mediaType === "document" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4 mr-1" />
                )}
                Arquivo
              </Button>
            </div>

            {/* Media Preview */}
            {mediaUrl && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mediaType === "image" && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {mediaType === "audio" && (
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileAudio className="h-6 w-6 text-primary" />
                        </div>
                        <audio controls className="h-8 max-w-[200px]">
                          <source src={mediaUrl} />
                        </audio>
                      </div>
                    )}
                    {mediaType === "video" && (
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-border bg-black">
                        <video src={mediaUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="h-6 w-6 text-white/70" />
                        </div>
                      </div>
                    )}
                    {mediaType === "document" && (
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Paperclip className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {mediaFileName || "Arquivo anexado"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {mediaType === "document" ? "Documento" : mediaType}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveMedia}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Seleção de público */}
          <div className="space-y-3">
            <Label>Público-alvo</Label>
            <Tabs value={targetType} onValueChange={(v) => setTargetType(v as "clients" | "resellers")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clients" className="gap-2">
                  <Users className="h-4 w-4" />
                  Clientes
                </TabsTrigger>
                <TabsTrigger value="resellers" className="gap-2">
                  <Users2 className="h-4 w-4" />
                  Revendedores
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="clients" className="mt-4 space-y-4">
                <div className="p-4 rounded-lg border border-border bg-background space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filtros do CRM
                  </div>
                  
                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {leadStatuses.map((status) => (
                        <Badge
                          key={status.value}
                          variant={filterStatus.includes(status.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem(filterStatus, status.value, setFilterStatus)}
                        >
                          {status.label}
                          {filterStatus.includes(status.value) && (
                            <X className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Origem */}
                  <div className="space-y-2">
                    <Label className="text-xs">Origem</Label>
                    <div className="flex flex-wrap gap-2">
                      {leadSources.map((source) => (
                        <Badge
                          key={source.value}
                          variant={filterSource.includes(source.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem(filterSource, source.value, setFilterSource)}
                        >
                          {source.label}
                          {filterSource.includes(source.value) && (
                            <X className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant={filterTags.includes(tag.id) ? "default" : "outline"}
                            className="cursor-pointer"
                            style={{
                              backgroundColor: filterTags.includes(tag.id) ? tag.color : "transparent",
                              borderColor: tag.color,
                              color: filterTags.includes(tag.id) ? "hsl(var(--primary-foreground))" : tag.color,
                            }}
                            onClick={() => toggleArrayItem(filterTags, tag.id, setFilterTags)}
                          >
                            {tag.name}
                            {filterTags.includes(tag.id) && (
                              <X className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="resellers" className="mt-4">
                <div className="p-4 rounded-lg border border-border bg-background text-center text-sm text-muted-foreground">
                  Todos os revendedores ativos serão incluídos na campanha.
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Modo de envio */}
          <div className="space-y-3">
            <Label>Quando enviar</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={sendMode === "now" ? "secondary" : "outline"}
                className="justify-start gap-2 h-auto py-3"
                onClick={() => setSendMode("now")}
              >
                <Send className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Enviar agora</div>
                  <div className="text-xs text-muted-foreground">Iniciar imediatamente</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={sendMode === "scheduled" ? "secondary" : "outline"}
                className="justify-start gap-2 h-auto py-3"
                onClick={() => setSendMode("scheduled")}
              >
                <Clock className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Agendar</div>
                  <div className="text-xs text-muted-foreground">Escolher data e hora</div>
                </div>
              </Button>
            </div>

            {sendMode === "scheduled" && (
              <div className="flex gap-3 mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-32 bg-background border-border"
                />
              </div>
            )}
          </div>

          {/* Velocidade de envio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Velocidade de Envio</Label>
              <span className="text-sm text-muted-foreground">
                {speedRange[0]}s - {speedRange[1]}s entre mensagens
              </span>
            </div>
            <Slider
              value={speedRange}
              onValueChange={setSpeedRange}
              min={5}
              max={60}
              step={5}
              className="py-4"
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--gold))] mt-0.5 shrink-0" />
              <div className="text-xs text-[hsl(var(--gold))]">
                <strong>Recomendação Anti-Ban:</strong> Recomendamos um intervalo de pelo menos 10 a 30 segundos entre as mensagens para evitar restrições na conta do WhatsApp.
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSubmit(true)}
            disabled={!title || isLoading}
          >
            Salvar como rascunho
          </Button>
          <Button 
            onClick={() => handleSubmit(false)}
            disabled={!title || !message || isLoading}
            className="gold-gradient text-primary-foreground"
          >
            {sendMode === "scheduled" ? "Agendar Campanha" : "Criar e Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
