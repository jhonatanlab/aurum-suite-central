import { useState } from "react";
import { Plus, Megaphone, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignsList } from "@/components/campanhas/CampaignsList";
import { NewCampaignModal } from "@/components/campanhas/NewCampaignModal";
import { CampaignDetailPanel } from "@/components/campanhas/CampaignDetailPanel";
import { useCampaigns, Campaign, CampaignFormData } from "@/hooks/useCampaigns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Campanhas() {
  const { campaigns, isLoading, refetch, createCampaign, updateCampaign, cancelCampaign, deleteCampaign } = useCampaigns();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [campaignToCancel, setCampaignToCancel] = useState<string | null>(null);

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNew = () => {
    setSelectedCampaign(null);
    setModalOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setModalOpen(true);
  };

  const handleViewDetails = (campaign: Campaign) => {
    setDetailCampaign(campaign);
  };

  const handleSave = (data: CampaignFormData) => {
    if (selectedCampaign) {
      updateCampaign.mutate({ id: selectedCampaign.id, ...data }, {
        onSuccess: () => setModalOpen(false),
      });
    } else {
      createCampaign.mutate(data, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleCancelClick = (campaignId: string) => {
    setCampaignToCancel(campaignId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (campaignToCancel) {
      cancelCampaign.mutate(campaignToCancel);
      setCancelDialogOpen(false);
      setCampaignToCancel(null);
    }
  };

  const handleDeleteClick = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (campaignToDelete) {
      deleteCampaign.mutate(campaignToDelete);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  return (
    <AppLayout title="Campanhas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-[hsl(var(--gold))]" />
              Campanhas de Marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie e gerencie campanhas de WhatsApp para alcançar seus clientes.
            </p>
          </div>
          <Button onClick={handleOpenNew} className="gold-gradient text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>

        {/* Lista */}
        <CampaignsList
          campaigns={filteredCampaigns}
          isLoading={isLoading}
          onEdit={handleEdit}
          onCancel={handleCancelClick}
          onDelete={handleDeleteClick}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Painel de detalhes da campanha */}
      {detailCampaign && (
        <CampaignDetailPanel
          campaign={detailCampaign}
          onClose={() => setDetailCampaign(null)}
          onUpdate={() => {
            refetch();
            // Refresh detail campaign data
            const updated = campaigns.find(c => c.id === detailCampaign.id);
            if (updated) setDetailCampaign(updated);
          }}
        />
      )}

      {/* Modal de criação/edição */}
      <NewCampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        campaign={selectedCampaign}
        isLoading={createCampaign.isPending || updateCampaign.isPending}
      />

      {/* Dialog de cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar a campanha. Mensagens já enviadas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground">
              Cancelar campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
