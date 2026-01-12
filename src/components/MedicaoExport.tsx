import { useState, useMemo } from 'react';
import { ServiceEntry, MedicaoSummary, ReportTemplate, ReportConfig } from '@/types/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicaoExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getMedicaoSummary: (contratada?: string, periodo?: { inicio: string; fim: string }) => MedicaoSummary[];
}

const TEMPLATE_NAMES: Record<ReportTemplate, string> = {
  'der-sp': 'DER-SP - Boletim de Medição',
  'dnit': 'DNIT - Planilha de Medição',
  'nota-servico': 'Nota de Serviço Simples',
  'boletim-medicao': 'Boletim de Medição Consolidado',
};

export function MedicaoExport({
  open,
  onOpenChange,
  getMedicaoSummary,
}: MedicaoExportProps) {
  const [config, setConfig] = useState<ReportConfig>({
    template: 'nota-servico',
    titulo: '',
    contratante: '',
    contrato: '',
    medicaoNumero: 1,
    periodo: { inicio: '', fim: '' },
    contratada: '',
  });

  // Get all summaries to extract contratadas list
  const allSummaries = useMemo(() => getMedicaoSummary(), [getMedicaoSummary]);
  const contratadas = useMemo(() => 
    [...new Set(allSummaries.flatMap(s => s.itens.map(i => i.contratada)))].sort(),
    [allSummaries]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getFilteredData = (): ServiceEntry[] => {
    const periodo = config.periodo.inicio && config.periodo.fim ? config.periodo : undefined;
    const summaries = getMedicaoSummary(config.contratada || undefined, periodo);
    return summaries.flatMap(s => s.itens);
  };

  const groupByCode = (entries: ServiceEntry[]) => {
    const grouped: Record<string, { codigo: string; descricao: string; unidade: string; precoUnitario: number; quantidade: number; valorTotal: number }> = {};
    
    entries.forEach(entry => {
      if (!grouped[entry.codigo]) {
        grouped[entry.codigo] = {
          codigo: entry.codigo,
          descricao: entry.descricao,
          unidade: entry.unidade,
          precoUnitario: entry.precoUnitario,
          quantidade: 0,
          valorTotal: 0,
        };
      }
      grouped[entry.codigo].quantidade += entry.quantidade;
      grouped[entry.codigo].valorTotal += entry.valorTotal;
    });
    
    return Object.values(grouped).sort((a, b) => a.codigo.localeCompare(b.codigo));
  };

  const exportToExcel = async () => {
    const entries = getFilteredData();
    if (entries.length === 0) {
      toast.error('Nenhum dado para exportar com os filtros selecionados');
      return;
    }

    const grouped = groupByCode(entries);
    const total = grouped.reduce((sum, g) => sum + g.valorTotal, 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema RDA';
    workbook.created = new Date();

    // Estilos
    const titleStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      },
    };

    const cellBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    const labelStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 10 },
    };

    const totalStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFE6' } },
      border: cellBorder,
    };

    // ===== ABA MEDIÇÃO =====
    const sheet = workbook.addWorksheet('Medição');
    sheet.columns = [
      { width: 8 },  // ITEM
      { width: 14 }, // CÓDIGO
      { width: 50 }, // DESCRIÇÃO
      { width: 12 }, // UNIDADE
      { width: 14 }, // QUANTIDADE
      { width: 18 }, // PREÇO UNITÁRIO
      { width: 18 }, // VALOR TOTAL
    ];

    let row = 1;

    // Título
    sheet.mergeCells(`A${row}:G${row}`);
    const titleCell = sheet.getCell(`A${row}`);
    titleCell.value = TEMPLATE_NAMES[config.template];
    titleCell.style = titleStyle;
    sheet.getRow(row).height = 30;

    row += 2;

    // Info header
    sheet.getCell(`A${row}`).value = 'CONTRATANTE:';
    sheet.getCell(`A${row}`).style = labelStyle;
    sheet.mergeCells(`B${row}:G${row}`);
    sheet.getCell(`B${row}`).value = config.contratante || '-';
    row++;

    sheet.getCell(`A${row}`).value = 'CONTRATADA:';
    sheet.getCell(`A${row}`).style = labelStyle;
    sheet.mergeCells(`B${row}:G${row}`);
    sheet.getCell(`B${row}`).value = config.contratada || entries[0]?.contratada || '-';
    row++;

    sheet.getCell(`A${row}`).value = 'CONTRATO:';
    sheet.getCell(`A${row}`).style = labelStyle;
    sheet.mergeCells(`B${row}:G${row}`);
    sheet.getCell(`B${row}`).value = config.contrato || '-';
    row++;

    sheet.getCell(`A${row}`).value = 'MEDIÇÃO Nº:';
    sheet.getCell(`A${row}`).style = labelStyle;
    sheet.getCell(`B${row}`).value = config.medicaoNumero || 1;
    row++;

    sheet.getCell(`A${row}`).value = 'PERÍODO:';
    sheet.getCell(`A${row}`).style = labelStyle;
    sheet.mergeCells(`B${row}:G${row}`);
    sheet.getCell(`B${row}`).value = `${formatDate(config.periodo.inicio || entries[0]?.data || '')} a ${formatDate(config.periodo.fim || entries[entries.length - 1]?.data || '')}`;
    row += 2;

    // Cabeçalho da tabela
    const headers = ['ITEM', 'CÓDIGO', 'DESCRIÇÃO DO SERVIÇO', 'UNIDADE', 'QTD', 'PREÇO UNIT.', 'VALOR TOTAL'];
    const headerRow = sheet.getRow(row);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });
    headerRow.height = 22;
    row++;

    // Dados
    grouped.forEach((item, idx) => {
      const dataRow = sheet.getRow(row);
      const values = [
        idx + 1,
        item.codigo,
        item.descricao,
        item.unidade,
        item.quantidade,
        item.precoUnitario,
        item.valorTotal,
      ];
      values.forEach((v, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = v;
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle', wrapText: i === 2 };
        if (i >= 4) {
          cell.numFmt = i === 4 ? '#,##0.00' : 'R$ #,##0.00';
        }
      });
      row++;
    });

    // Total
    row++;
    sheet.mergeCells(`A${row}:E${row}`);
    sheet.getCell(`F${row}`).value = 'TOTAL:';
    sheet.getCell(`F${row}`).style = totalStyle;
    sheet.getCell(`G${row}`).value = total;
    sheet.getCell(`G${row}`).style = totalStyle;
    sheet.getCell(`G${row}`).numFmt = 'R$ #,##0.00';

    // ===== ABA DETALHADO =====
    const detailSheet = workbook.addWorksheet('Detalhado');
    detailSheet.columns = [
      { width: 12 }, { width: 12 }, { width: 40 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 10 }, { width: 10 }, { width: 8 }, { width: 6 }, { width: 12 }, { width: 8 },
      { width: 14 }, { width: 14 }, { width: 22 },
    ];

    // Cabeçalho detalhado
    const detailHeaders = ['DATA', 'CÓDIGO', 'DESCRIÇÃO', 'TRECHO', 'KM INI', 'KM FIM', 'EST INI', 'EST FIM', 'FAIXA', 'LADO', 'QTD', 'UNID', 'P.UNIT', 'TOTAL', 'FISCAL'];
    const detailHeaderRow = detailSheet.getRow(1);
    detailHeaders.forEach((h, i) => {
      const cell = detailHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });
    detailHeaderRow.height = 22;

    // Dados detalhados
    entries.forEach((e, idx) => {
      const dataRow = detailSheet.getRow(idx + 2);
      const values = [
        formatDate(e.data),
        e.codigo,
        e.descricao,
        e.trecho || '',
        e.kmInicial || '',
        e.kmFinal || '',
        e.estacaInicial || '',
        e.estacaFinal || '',
        e.faixa || '',
        e.lado || '',
        e.quantidade,
        e.unidade,
        e.precoUnitario,
        e.valorTotal,
        e.fiscal,
      ];
      values.forEach((v, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = v;
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle', wrapText: i === 2 };
        if (i === 12 || i === 13) {
          cell.numFmt = 'R$ #,##0.00';
        }
      });
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `medicao_${config.template}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Arquivo ${fileName} exportado!`);
  };

  const exportToPDF = () => {
    const entries = getFilteredData();
    if (entries.length === 0) {
      toast.error('Nenhum dado para exportar com os filtros selecionados');
      return;
    }

    const grouped = groupByCode(entries);
    const total = grouped.reduce((sum, g) => sum + g.valorTotal, 0);

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header based on template
    const title = TEMPLATE_NAMES[config.template];
    const headerHeight = 40;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const leftCol = 15;
    const rightCol = pageWidth / 2 + 10;
    let y = 25;

    doc.text(`Contratante: ${config.contratante || '-'}`, leftCol, y);
    doc.text(`Medição Nº: ${config.medicaoNumero || 1}`, rightCol, y);
    y += 5;
    doc.text(`Contratada: ${config.contratada || entries[0]?.contratada || '-'}`, leftCol, y);
    doc.text(`Período: ${formatDate(config.periodo.inicio || entries[0]?.data || '')} a ${formatDate(config.periodo.fim || entries[entries.length - 1]?.data || '')}`, rightCol, y);
    y += 5;
    doc.text(`Contrato: ${config.contrato || '-'}`, leftCol, y);

    // Table
    const tableData = grouped.map((item, idx) => [
      (idx + 1).toString(),
      item.codigo,
      item.descricao.length > 60 ? item.descricao.substring(0, 57) + '...' : item.descricao,
      item.unidade,
      item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      formatCurrency(item.precoUnitario),
      formatCurrency(item.valorTotal),
    ]);

    autoTable(doc, {
      head: [['ITEM', 'CÓDIGO', 'DESCRIÇÃO DO SERVIÇO', 'UN', 'QUANTIDADE', 'P. UNITÁRIO', 'VALOR TOTAL']],
      body: tableData,
      startY: headerHeight,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 90 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 35, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Total row
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`VALOR TOTAL: ${formatCurrency(total)}`, pageWidth - 15, finalY, { align: 'right' });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, leftCol, footerY);

    // Signature lines for formal templates
    if (config.template === 'der-sp' || config.template === 'dnit' || config.template === 'boletim-medicao') {
      const sigY = footerY - 15;
      const sigWidth = 60;
      
      doc.line(leftCol, sigY, leftCol + sigWidth, sigY);
      doc.text('Responsável Contratada', leftCol + sigWidth / 2, sigY + 5, { align: 'center' });
      
      doc.line(pageWidth / 2 - sigWidth / 2, sigY, pageWidth / 2 + sigWidth / 2, sigY);
      doc.text('Fiscal', pageWidth / 2, sigY + 5, { align: 'center' });
      
      doc.line(pageWidth - leftCol - sigWidth, sigY, pageWidth - leftCol, sigY);
      doc.text('Contratante', pageWidth - leftCol - sigWidth / 2, sigY + 5, { align: 'center' });
    }

    // Download
    const fileName = `medicao_${config.template}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success(`Arquivo ${fileName} exportado!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Exportar Relatório de Medição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selection */}
          <div>
            <Label>Template</Label>
            <Select
              value={config.template}
              onValueChange={(v) => setConfig({ ...config, template: v as ReportTemplate })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nota-servico">Nota de Serviço Simples</SelectItem>
                <SelectItem value="boletim-medicao">Boletim de Medição Consolidado</SelectItem>
                <SelectItem value="der-sp">DER-SP - Boletim de Medição</SelectItem>
                <SelectItem value="dnit">DNIT - Planilha de Medição</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contratante</Label>
              <Input
                value={config.contratante}
                onChange={(e) => setConfig({ ...config, contratante: e.target.value })}
                placeholder="Nome do contratante"
              />
            </div>
            <div>
              <Label>Nº do Contrato</Label>
              <Input
                value={config.contrato}
                onChange={(e) => setConfig({ ...config, contrato: e.target.value })}
                placeholder="Ex: 001/2024"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contratada</Label>
              <Select
                value={config.contratada || 'all'}
                onValueChange={(v) => setConfig({ ...config, contratada: v === 'all' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {contratadas.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Medição Nº</Label>
              <Input
                type="number"
                min={1}
                value={config.medicaoNumero}
                onChange={(e) => setConfig({ ...config, medicaoNumero: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Período - Início</Label>
              <Input
                type="date"
                value={config.periodo.inicio}
                onChange={(e) => setConfig({ ...config, periodo: { ...config.periodo, inicio: e.target.value } })}
              />
            </div>
            <div>
              <Label>Período - Fim</Label>
              <Input
                type="date"
                value={config.periodo.fim}
                onChange={(e) => setConfig({ ...config, periodo: { ...config.periodo, fim: e.target.value } })}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {getFilteredData().length} lançamento(s) serão exportados
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}