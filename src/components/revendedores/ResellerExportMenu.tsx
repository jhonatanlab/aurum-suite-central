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
import type { StatementEvent } from "@/hooks/useResellerStatement";
import type { ResellerReportData, ConsolidatedReport } from "@/hooks/useResellerReports";

type ExportType = "statement" | "report";

interface StatementExportProps {
  type: "statement";
  data: StatementEvent[];
  resellerName: string;
  totals: {
    totalCredits: number;
    totalDebits: number;
    currentBalance: number;
  };
}

interface ReportExportProps {
  type: "report";
  data: ResellerReportData[];
  consolidated: ConsolidatedReport | null;
}

type ResellerExportMenuProps = StatementExportProps | ReportExportProps;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getEventTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    consignment: "Consignação",
    sale: "Venda",
    return: "Devolução",
    closing: "Fechamento",
    payment: "Pagamento",
  };
  return labels[type] || type;
};

export function ResellerExportMenu(props: ResellerExportMenuProps) {
  const exportStatementToCSV = (
    data: StatementEvent[],
    resellerName: string
  ) => {
    try {
      const headers = ["Data", "Tipo", "Referência", "Descrição", "Crédito", "Débito", "Saldo"];
      
      const rows = data.map((e) => [
        format(new Date(e.date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        getEventTypeLabel(e.type),
        e.reference,
        e.description,
        e.credit > 0 ? formatCurrency(e.credit) : "-",
        e.debit > 0 ? formatCurrency(e.debit) : "-",
        formatCurrency(e.balance),
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `extrato_${resellerName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Extrato exportado para CSV!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar para CSV");
    }
  };

  const exportStatementToPDF = (
    data: StatementEvent[],
    resellerName: string,
    totals: StatementExportProps["totals"]
  ) => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Extrato Financeiro - Revendedor", 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Revendedor: ${resellerName}`, 14, 32);
      doc.text(
        `Data de exportação: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
        14,
        38
      );

      // Summary
      doc.setFontSize(10);
      doc.text(`Total Créditos: ${formatCurrency(totals.totalCredits)}`, 14, 48);
      doc.text(`Total Débitos: ${formatCurrency(totals.totalDebits)}`, 14, 54);
      doc.setFontSize(11);
      doc.setTextColor(totals.currentBalance > 0 ? 200 : 40);
      doc.text(`Saldo Atual: ${formatCurrency(totals.currentBalance)}`, 14, 62);

      // Table
      const tableData = data.map((e) => [
        format(new Date(e.date), "dd/MM/yyyy"),
        getEventTypeLabel(e.type),
        e.reference,
        e.description.length > 35
          ? e.description.substring(0, 35) + "..."
          : e.description,
        e.credit > 0 ? formatCurrency(e.credit) : "-",
        e.debit > 0 ? formatCurrency(e.debit) : "-",
        formatCurrency(e.balance),
      ]);

      autoTable(doc, {
        startY: 70,
        head: [["Data", "Tipo", "Ref.", "Descrição", "Crédito", "Débito", "Saldo"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [199, 160, 82],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 22 },
          2: { cellWidth: 16 },
          3: { cellWidth: 50 },
          4: { cellWidth: 24 },
          5: { cellWidth: 24 },
          6: { cellWidth: 24 },
        },
      });

      doc.save(
        `extrato_${resellerName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`
      );
      toast.success("Extrato exportado para PDF!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar para PDF");
    }
  };

  const exportReportToCSV = (
    data: ResellerReportData[],
    consolidated: ConsolidatedReport | null
  ) => {
    try {
      const headers = [
        "Revendedor",
        "Peças Vendidas",
        "Valor Vendido",
        "Comissão",
        "Total Pago",
        "Saldo Pendente",
        "Peças em Mãos",
        "Devoluções",
      ];

      const rows = data.map((r) => [
        r.resellerName,
        r.totalSold.toString(),
        formatCurrency(r.totalSoldValue),
        formatCurrency(r.totalCommission),
        formatCurrency(r.totalPaid),
        formatCurrency(r.pendingBalance),
        r.itemsWithReseller.toString(),
        r.totalReturned.toString(),
      ]);

      // Add consolidated row
      if (consolidated) {
        rows.push([
          "TOTAL",
          data.reduce((sum, r) => sum + r.totalSold, 0).toString(),
          formatCurrency(consolidated.totalSoldValue),
          formatCurrency(consolidated.totalCommission),
          formatCurrency(consolidated.totalPaid),
          formatCurrency(consolidated.totalPending),
          consolidated.totalItemsWithResellers.toString(),
          data.reduce((sum, r) => sum + r.totalReturned, 0).toString(),
        ]);
      }

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_revendedores_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado para CSV!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar para CSV");
    }
  };

  const exportReportToPDF = (
    data: ResellerReportData[],
    consolidated: ConsolidatedReport | null
  ) => {
    try {
      const doc = new jsPDF("landscape");

      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Relatório Gerencial - Revendedores", 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(
        `Data de exportação: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
        14,
        30
      );

      // Summary cards
      if (consolidated) {
        doc.setFontSize(10);
        doc.text(`Total Vendido: ${formatCurrency(consolidated.totalSoldValue)}`, 14, 40);
        doc.text(`Total Comissões: ${formatCurrency(consolidated.totalCommission)}`, 14, 46);
        doc.text(`Total Pago: ${formatCurrency(consolidated.totalPaid)}`, 100, 40);
        doc.text(`Saldo Pendente: ${formatCurrency(consolidated.totalPending)}`, 100, 46);
        doc.text(`Revendedores Ativos: ${consolidated.activeResellers}/${consolidated.totalResellers}`, 200, 40);
        doc.text(`Peças em Consignação: ${consolidated.totalItemsWithResellers}`, 200, 46);
      }

      // Table
      const tableData = data.map((r) => [
        r.resellerName,
        r.totalSold.toString(),
        formatCurrency(r.totalSoldValue),
        formatCurrency(r.totalCommission),
        formatCurrency(r.totalPaid),
        formatCurrency(r.pendingBalance),
        r.itemsWithReseller.toString(),
        r.totalReturned.toString(),
      ]);

      autoTable(doc, {
        startY: 55,
        head: [
          [
            "Revendedor",
            "Vendas",
            "Valor Vendido",
            "Comissão",
            "Pago",
            "Pendente",
            "Em Mãos",
            "Devol.",
          ],
        ],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [199, 160, 82],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`relatorio_revendedores_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório exportado para PDF!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar para PDF");
    }
  };

  const handleExportCSV = () => {
    if (props.type === "statement") {
      exportStatementToCSV(props.data, props.resellerName);
    } else {
      exportReportToCSV(props.data, props.consolidated);
    }
  };

  const handleExportPDF = () => {
    if (props.type === "statement") {
      exportStatementToPDF(props.data, props.resellerName, props.totals);
    } else {
      exportReportToPDF(props.data, props.consolidated);
    }
  };

  const hasData = props.data.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!hasData} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-popover border-border" align="end">
        <DropdownMenuItem
          onClick={handleExportCSV}
          className="cursor-pointer focus:bg-secondary"
        >
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportPDF}
          className="cursor-pointer focus:bg-secondary"
        >
          <File className="h-4 w-4 mr-2 text-red-500" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
