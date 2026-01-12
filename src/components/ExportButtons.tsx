import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Activity } from '@/types/activity';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportButtonsProps {
  activities: Activity[];
}

export function ExportButtons({ activities }: ExportButtonsProps) {
  // Formato resumido (igual ao PDF)
  const formatDataForExcelResumo = () => {
    return activities.map((a) => ({
      'Data': a.data,
      'Dia': a.dia,
      'Cód.': a.codigo || 'RD',
      'Obra': a.obra,
      'Fiscal': a.fiscal,
      'Contratada': a.contratada,
      'Clima M/T/N': `${a.condicaoManha || '-'}/${a.condicaoTarde || '-'}/${a.condicaoNoite || '-'}`,
      'Pratic.': a.praticavel ? 'SIM' : 'NÃO',
      'Efet.': a.efetivoTotal,
      'Equip.': a.equipamentos,
      'Atividades': a.atividades,
    }));
  };

  // Formato detalhado (todas as colunas)
  const formatDataForExcelDetalhado = () => {
    return activities.map((a) => ({
      'Data': a.data,
      'Dia': a.dia,
      'Código': a.codigo || 'RD',
      'Área': a.area || '',
      'CN': a.cn || '',
      'Obra': a.obra,
      'Frente de Obra': a.frenteObra,
      'Fiscal': a.fiscal,
      'Cliente': a.cliente || '',
      'Contratada': a.contratada,
      'Temp. (ºC)': a.temperatura || '',
      'Manhã': a.condicaoManha || '',
      'Tarde': a.condicaoTarde || '',
      'Noite': a.condicaoNoite || '',
      'Praticável': a.praticavel ? 'SIM' : 'NÃO',
      'Volume Chuva (mm)': a.volumeChuva || 0,
      'Efetivo Detalhado': a.efetivoDetalhado?.map(e => `${e.funcao}: ${e.quantidade}`).join('; ') || '',
      'Efetivo Total': a.efetivoTotal,
      'Equipamentos Detalhado': a.equipamentosDetalhado?.map(e => `${e.equipamento}: ${e.quantidade}`).join('; ') || '',
      'Equipamentos Total': a.equipamentos,
      'Atividades': a.atividades,
      'Observações': a.observacoes || '',
      'Ocorrências': a.ocorrencias || '',
    }));
  };

  const exportToExcel = () => {
    if (activities.length === 0) {
      toast.error('Nenhuma atividade para exportar.');
      return;
    }

    const resumoData = formatDataForExcelResumo();
    const detalhadoData = formatDataForExcelDetalhado();
    
    const workbook = XLSX.utils.book_new();
    
    // Aba Resumo (modelo igual ao PDF)
    const resumoSheet = XLSX.utils.json_to_sheet(resumoData);
    const resumoColWidths = [
      { wch: 12 }, // Data
      { wch: 14 }, // Dia
      { wch: 6 },  // Cód.
      { wch: 25 }, // Obra
      { wch: 35 }, // Fiscal
      { wch: 15 }, // Contratada
      { wch: 16 }, // Clima M/T/N
      { wch: 8 },  // Pratic.
      { wch: 6 },  // Efet.
      { wch: 7 },  // Equip.
      { wch: 80 }, // Atividades
    ];
    resumoSheet['!cols'] = resumoColWidths;
    XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
    
    // Aba Detalhado (todas as colunas)
    const detalhadoSheet = XLSX.utils.json_to_sheet(detalhadoData);
    const detalhadoColWidths = Object.keys(detalhadoData[0]).map((key) => ({
      wch: Math.max(key.length, ...detalhadoData.map((row) => String(row[key as keyof typeof row] || '').length)),
    }));
    detalhadoSheet['!cols'] = detalhadoColWidths;
    XLSX.utils.book_append_sheet(workbook, detalhadoSheet, 'Detalhado');

    const fileName = `RDAs-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Exportado para Excel com sucesso!');
  };

  const exportToPDF = () => {
    if (activities.length === 0) {
      toast.error('Nenhuma atividade para exportar.');
      return;
    }

    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.text('RELATÓRIO DE ATIVIDADES - RDA', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    doc.text(`Total de registros: ${activities.length}`, 14, 36);

    // Summary table with better column widths
    const summaryTableData = activities.map((a) => [
      a.data,
      a.dia,
      a.codigo || 'RD',
      a.obra,
      a.fiscal,
      a.contratada,
      `${a.condicaoManha || '-'}/${a.condicaoTarde || '-'}/${a.condicaoNoite || '-'}`,
      a.praticavel ? 'SIM' : 'NÃO',
      a.efetivoTotal.toString(),
      a.equipamentos.toString(),
      a.atividades.substring(0, 80) + (a.atividades.length > 80 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: 42,
      head: [[
        'Data',
        'Dia',
        'Cód.',
        'Obra',
        'Fiscal',
        'Contratada',
        'Clima M/T/N',
        'Pratic.',
        'Efet.',
        'Equip.',
        'Atividades',
      ]],
      body: summaryTableData,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 20 }, // Data
        1: { cellWidth: 22 }, // Dia
        2: { cellWidth: 10 }, // Cód
        3: { cellWidth: 30 }, // Obra
        4: { cellWidth: 40 }, // Fiscal
        5: { cellWidth: 20 }, // Contratada
        6: { cellWidth: 25 }, // Clima
        7: { cellWidth: 12 }, // Praticável
        8: { cellWidth: 10 }, // Efet
        9: { cellWidth: 10 }, // Equip
        10: { cellWidth: 'auto' }, // Atividades - usa o resto do espaço
      },
    });

    // Detailed pages for each activity
    activities.forEach((a, index) => {
      doc.addPage();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`RDA - ${a.data} - ${a.obra}`, margin, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let y = 35;
      
      // Info grid
      doc.setFont('helvetica', 'bold');
      doc.text('Código:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.codigo || 'RD', margin + 25, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Área:', margin + 60, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.area || '-', margin + 75, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('CN:', margin + 130, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.cn || '-', margin + 140, y);
      y += 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Fiscal:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.fiscal, margin + 25, y);
      y += 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.cliente || '-', margin + 25, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Contratada:', margin + 130, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.contratada, margin + 155, y);
      y += 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Dia:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(a.dia, margin + 25, y);
      y += 12;
      
      // Weather conditions box
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, maxWidth, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('CONDIÇÕES DE TEMPO', margin + 3, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Temperatura: ${a.temperatura || '-'}ºC`, margin + 3, y);
      doc.text(`Manhã: ${a.condicaoManha || '-'}`, margin + 60, y);
      doc.text(`Tarde: ${a.condicaoTarde || '-'}`, margin + 110, y);
      doc.text(`Noite: ${a.condicaoNoite || '-'}`, margin + 160, y);
      y += 6;
      doc.text(`Praticável: ${a.praticavel ? 'SIM' : 'NÃO'}`, margin + 3, y);
      doc.text(`Volume Chuva: ${a.volumeChuva || 0}mm`, margin + 60, y);
      y += 14;
      
      // Efetivo e Equipamentos lado a lado
      const halfWidth = (maxWidth - 10) / 2;
      
      if (a.efetivoDetalhado && a.efetivoDetalhado.length > 0) {
        doc.setFillColor(230, 245, 255);
        const efetivoHeight = Math.max(20, (a.efetivoDetalhado.length + 1) * 5 + 8);
        doc.rect(margin, y - 4, halfWidth, efetivoHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('EFETIVO', margin + 3, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        a.efetivoDetalhado.forEach((e) => {
          doc.text(`• ${e.funcao}: ${e.quantidade}`, margin + 5, y);
          y += 5;
        });
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: ${a.efetivoTotal} pessoas`, margin + 5, y);
        y -= a.efetivoDetalhado.length * 5 + 5;
      }
      
      let yEquip = y;
      if (a.equipamentosDetalhado && a.equipamentosDetalhado.length > 0) {
        doc.setFillColor(255, 245, 230);
        const equipHeight = Math.max(20, (a.equipamentosDetalhado.length + 1) * 5 + 8);
        doc.rect(margin + halfWidth + 10, yEquip - 4, halfWidth, equipHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('EQUIPAMENTOS', margin + halfWidth + 13, yEquip);
        yEquip += 5;
        doc.setFont('helvetica', 'normal');
        a.equipamentosDetalhado.forEach((e) => {
          doc.text(`• ${e.equipamento}: ${e.quantidade}`, margin + halfWidth + 15, yEquip);
          yEquip += 5;
        });
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: ${a.equipamentos} equipamentos`, margin + halfWidth + 15, yEquip);
      }
      
      // Avançar y para depois das caixas
      const efetivoHeight = a.efetivoDetalhado ? (a.efetivoDetalhado.length + 2) * 5 + 8 : 0;
      const equipHeight = a.equipamentosDetalhado ? (a.equipamentosDetalhado.length + 2) * 5 + 8 : 0;
      y += Math.max(efetivoHeight, equipHeight) + 5;
      
      // Atividades - com texto completo
      doc.setFont('helvetica', 'bold');
      doc.text('ATIVIDADES:', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      const atividadesLines = doc.splitTextToSize(a.atividades, maxWidth - 5);
      
      // Verificar se precisa de nova página para atividades
      if (y + atividadesLines.length * 4 > pageHeight - 30) {
        doc.addPage();
        y = 20;
        doc.setFont('helvetica', 'bold');
        doc.text('ATIVIDADES (continuação):', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
      }
      
      atividadesLines.forEach((line: string) => {
        if (y > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin + 2, y);
        y += 4;
      });
      y += 6;
      
      // Observações
      if (a.observacoes && a.observacoes.trim()) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES:', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(a.observacoes, maxWidth - 5);
        obsLines.forEach((line: string) => {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin + 2, y);
          y += 4;
        });
        y += 6;
      }
      
      // Ocorrências
      if (a.ocorrencias && a.ocorrencias.trim()) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('OCORRÊNCIAS:', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const ocorrLines = doc.splitTextToSize(a.ocorrencias, maxWidth - 5);
        ocorrLines.forEach((line: string) => {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin + 2, y);
          y += 4;
        });
      }
      
      // Page number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${index + 2} de ${activities.length + 1}`, pageWidth - 30, pageHeight - 10);
    });

    const fileName = `RDAs-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    toast.success('Exportado para PDF com sucesso!');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToExcel}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <FileText className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </div>
  );
}
