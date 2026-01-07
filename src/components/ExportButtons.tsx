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
  const formatDataForExcel = () => {
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

    const data = formatDataForExcel();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RDAs');

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, ...data.map((row) => String(row[key as keyof typeof row] || '').length)),
    }));
    worksheet['!cols'] = colWidths;

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

    // Table
    const tableData = activities.map((a) => [
      a.data,
      a.dia,
      a.codigo || 'RD',
      a.obra,
      a.fiscal,
      a.contratada,
      `${a.condicaoManha || '-'}/${a.condicaoTarde || '-'}/${a.condicaoNoite || '-'}`,
      a.praticavel ? 'SIM' : 'NÃO',
      a.efetivoTotal,
      a.equipamentos,
      a.atividades.substring(0, 50) + (a.atividades.length > 50 ? '...' : ''),
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
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Detailed pages for each activity
    activities.forEach((a, index) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`RDA - ${a.data} - ${a.obra}`, 14, 20);
      
      doc.setFontSize(10);
      let y = 35;
      
      doc.text(`Código: ${a.codigo || 'RD'}`, 14, y); y += 6;
      doc.text(`Área: ${a.area || '-'}`, 14, y); y += 6;
      doc.text(`CN: ${a.cn || '-'}`, 14, y); y += 6;
      doc.text(`Fiscal: ${a.fiscal}`, 14, y); y += 6;
      doc.text(`Cliente: ${a.cliente || '-'}`, 14, y); y += 6;
      doc.text(`Contratada: ${a.contratada}`, 14, y); y += 6;
      doc.text(`Dia: ${a.dia}`, 14, y); y += 10;
      
      doc.text('CONDIÇÕES DE TEMPO:', 14, y); y += 6;
      doc.text(`Temperatura: ${a.temperatura || '-'}ºC`, 14, y); y += 6;
      doc.text(`Manhã: ${a.condicaoManha || '-'} | Tarde: ${a.condicaoTarde || '-'} | Noite: ${a.condicaoNoite || '-'}`, 14, y); y += 6;
      doc.text(`Praticável: ${a.praticavel ? 'SIM' : 'NÃO'} | Volume Chuva: ${a.volumeChuva || 0}mm`, 14, y); y += 10;
      
      if (a.efetivoDetalhado && a.efetivoDetalhado.length > 0) {
        doc.text('EFETIVO:', 14, y); y += 6;
        a.efetivoDetalhado.forEach((e) => {
          doc.text(`  • ${e.funcao}: ${e.quantidade}`, 14, y); y += 5;
        });
        doc.text(`  Total: ${a.efetivoTotal} pessoas`, 14, y); y += 8;
      }
      
      if (a.equipamentosDetalhado && a.equipamentosDetalhado.length > 0) {
        doc.text('EQUIPAMENTOS:', 14, y); y += 6;
        a.equipamentosDetalhado.forEach((e) => {
          doc.text(`  • ${e.equipamento}: ${e.quantidade}`, 14, y); y += 5;
        });
        doc.text(`  Total: ${a.equipamentos} equipamentos`, 14, y); y += 8;
      }
      
      doc.text('ATIVIDADES:', 14, y); y += 6;
      const atividadesLines = doc.splitTextToSize(a.atividades, 260);
      doc.text(atividadesLines, 14, y); y += atividadesLines.length * 5 + 8;
      
      if (a.observacoes) {
        doc.text('OBSERVAÇÕES:', 14, y); y += 6;
        doc.text(a.observacoes, 14, y); y += 8;
      }
      
      if (a.ocorrencias) {
        doc.text('OCORRÊNCIAS:', 14, y); y += 6;
        doc.text(a.ocorrencias, 14, y);
      }
      
      doc.setFontSize(8);
      doc.text(`Página ${index + 2} de ${activities.length + 1}`, 270, 200);
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
