import { Download, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProducts } from "@/hooks/useProducts";

interface Lead {
  id: string;
  name: string;
  value: number | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  product_id?: string | null;
  product_value?: number | null;
  created_at: string | null;
  notes?: string | null;
}

interface Stage {
  id: string;
  name: string;
}

interface ContactsExportMenuProps {
  leads: Lead[];
  stages: Stage[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string | null) => {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

export function ContactsExportMenu({ leads, stages }: ContactsExportMenuProps) {
  const { getProductById } = useProducts();

  const buildRows = () =>
    leads.map((lead) => {
      const product = getProductById(lead.product_id || null);
      const stageName = stages.find((s) => s.id === lead.status)?.name || "—";
      const value = lead.product_value ?? lead.value ?? 0;
      return {
        Nome: lead.name || "—",
        Telefone: lead.phone || "—",
        Email: lead.email || "—",
        Etapa: stageName,
        Origem: lead.source || "—",
        Produto: product?.name || "—",
        Valor: formatCurrency(value),
        "Data de Cadastro": formatDate(lead.created_at),
        Observações: lead.notes || "—",
      };
    });

  const exportToCSV = () => {
    try {
      const rows = buildRows();
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(";"),
        ...rows.map((r) =>
          headers
            .map((h) => `"${String(r[h as keyof typeof r] ?? "").replace(/"/g, '""')}"`)
            .join(";"),
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contatos_crm_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Contatos exportados para CSV!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar para CSV");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF("landscape");

      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Contatos - CRM", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Data de exportação: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
        14,
        28,
      );
      doc.text(`Total de contatos: ${leads.length}`, 14, 34);

      const rows = buildRows();
      const headers = Object.keys(rows[0] || {});
      const body = rows.map((r) =>
        headers.map((h) => {
          const val = String(r[h as keyof typeof r] ?? "");
          return val.length > 40 ? val.substring(0, 40) + "..." : val;
        }),
      );

      autoTable(doc, {
        startY: 42,
        head: [headers],
        body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [199, 160, 82],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`contatos_crm_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Contatos exportados para PDF!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar para PDF");
    }
  };

  const hasData = leads.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!hasData} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-popover border-border" align="end">
        <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer focus:bg-secondary">
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer focus:bg-secondary">
          <File className="h-4 w-4 mr-2 text-red-500" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
