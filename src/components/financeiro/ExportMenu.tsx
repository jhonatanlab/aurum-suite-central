import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: string;
  value: number;
  method: string | null;
  status: string;
  category?: {
    name: string;
  } | null;
}

interface ExportMenuProps {
  transactions: Transaction[];
  companyName?: string;
}

export function ExportMenu({ transactions, companyName = "Empresa" }: ExportMenuProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pago: "Pago",
      pendente: "Pendente",
      atrasado: "Atrasado",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    return type === "entrada" ? "Entrada" : "Saída";
  };

  const getMethodLabel = (method: string | null) => {
    if (!method) return "—";
    const labels: Record<string, string> = {
      dinheiro: "Dinheiro",
      pix: "PIX",
      cartao_credito: "Cartão de Crédito",
      cartao_debito: "Cartão de Débito",
      boleto: "Boleto",
      transferencia: "Transferência",
    };
    return labels[method] || method;
  };

  const prepareData = () => {
    return transactions.map((t) => ({
      Data: format(new Date(t.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }),
      Descrição: t.description,
      Categoria: t.category?.name || "—",
      Tipo: getTypeLabel(t.type),
      Valor: formatCurrency(t.value),
      Status: getStatusLabel(t.status),
      Método: getMethodLabel(t.method),
    }));
  };

  const exportToExcel = () => {
    try {
      const data = prepareData();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      
      // Set column widths
      worksheet["!cols"] = [
        { wch: 12 }, // Data
        { wch: 35 }, // Descrição
        { wch: 20 }, // Categoria
        { wch: 10 }, // Tipo
        { wch: 15 }, // Valor
        { wch: 12 }, // Status
        { wch: 18 }, // Método
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Financeiro");
      
      const fileName = `financeiro_${companyName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success("Exportado para Excel com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar para Excel");
    }
  };

  const exportToCSV = () => {
    try {
      const data = prepareData();
      const headers = Object.keys(data[0] || {});
      
      const csvContent = [
        headers.join(";"),
        ...data.map((row) => 
          headers.map((header) => `"${row[header as keyof typeof row]}"`).join(";")
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financeiro_${companyName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Exportado para CSV com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar para CSV");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Relatório Financeiro", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Empresa: ${companyName}`, 14, 30);
      doc.text(`Data de exportação: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 36);
      doc.text(`Total de registros: ${transactions.length}`, 14, 42);

      // Summary
      const totalEntradas = transactions
        .filter((t) => t.type === "entrada")
        .reduce((sum, t) => sum + t.value, 0);
      const totalSaidas = transactions
        .filter((t) => t.type === "saida")
        .reduce((sum, t) => sum + t.value, 0);

      doc.text(`Total Entradas: ${formatCurrency(totalEntradas)}`, 14, 50);
      doc.text(`Total Saídas: ${formatCurrency(totalSaidas)}`, 14, 56);
      doc.text(`Saldo: ${formatCurrency(totalEntradas - totalSaidas)}`, 14, 62);

      // Table
      const tableData = transactions.map((t) => [
        format(new Date(t.date + "T00:00:00"), "dd/MM/yyyy"),
        t.description.length > 30 ? t.description.substring(0, 30) + "..." : t.description,
        t.category?.name || "—",
        getTypeLabel(t.type),
        formatCurrency(t.value),
        getStatusLabel(t.status),
      ]);

      autoTable(doc, {
        startY: 70,
        head: [["Data", "Descrição", "Categoria", "Tipo", "Valor", "Status"]],
        body: tableData,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 20 },
          4: { cellWidth: 28 },
          5: { cellWidth: 22 },
        },
      });

      const fileName = `financeiro_${companyName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      
      toast.success("Exportado para PDF com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar para PDF");
    }
  };

  const hasData = transactions.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!hasData}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-popover border-border" align="end">
        <DropdownMenuItem
          onClick={exportToExcel}
          className="cursor-pointer focus:bg-secondary"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToCSV}
          className="cursor-pointer focus:bg-secondary"
        >
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToPDF}
          className="cursor-pointer focus:bg-secondary"
        >
          <File className="h-4 w-4 mr-2 text-red-500" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
