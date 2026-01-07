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
  const formatDataForExport = () => {
    return activities.map((a) => ({
      Data: a.data,
      Dia: a.dia,
      Fiscal: a.fiscal,
      Contratada: a.contratada,
      Obra: a.obra,
      'Frente de Obra': a.frenteObra,
      'Condições Climáticas': a.condicoesClima,
      'Efetivo Total': a.efetivoTotal,
      Equipamentos: a.equipamentos,
      Atividades: a.atividades,
      Observações: a.observacoes || '',
    }));
  };

  const exportToExcel = () => {
    if (activities.length === 0) {
      toast.error('Nenhuma atividade para exportar.');
      return;
    }

    const data = formatDataForExport();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Atividades');

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, ...data.map((row) => String(row[key as keyof typeof row] || '').length)),
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `memoria-mensal-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    doc.text('Memória Mensal - Relatório de Atividades', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    doc.text(`Total de registros: ${activities.length}`, 14, 36);

    // Table
    const tableData = activities.map((a) => [
      a.data,
      a.dia,
      a.fiscal,
      a.contratada,
      a.obra,
      a.frenteObra,
      a.condicoesClima,
      a.efetivoTotal,
      a.equipamentos,
      a.atividades.substring(0, 50) + (a.atividades.length > 50 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: 42,
      head: [[
        'Data',
        'Dia',
        'Fiscal',
        'Contratada',
        'Obra',
        'Frente',
        'Clima',
        'Efetivo',
        'Equip.',
        'Atividades',
      ]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const fileName = `memoria-mensal-${new Date().toISOString().slice(0, 10)}.pdf`;
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
