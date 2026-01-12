import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, FileText, Filter } from 'lucide-react';
import { Activity } from '@/types/activity';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportButtonsProps {
  activities: Activity[];
}

export function ExportButtons({ activities }: ExportButtonsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtrar atividades por período
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];
    
    if (dataInicio) {
      filtered = filtered.filter(a => a.data >= dataInicio);
    }
    if (dataFim) {
      filtered = filtered.filter(a => a.data <= dataFim);
    }
    
    return filtered;
  }, [activities, dataInicio, dataFim]);

  const openExportDialog = (type: 'excel' | 'pdf') => {
    setExportType(type);
    // Preencher com range das atividades
    if (activities.length > 0) {
      const sortedDates = activities.map(a => a.data).sort();
      setDataInicio(sortedDates[0] || '');
      setDataFim(sortedDates[sortedDates.length - 1] || '');
    }
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (filteredActivities.length === 0) {
      toast.error('Nenhuma atividade no período selecionado.');
      return;
    }
    
    if (exportType === 'excel') {
      doExportToExcel(filteredActivities);
    } else {
      doExportToPDF(filteredActivities);
    }
    
    setDialogOpen(false);
  };

  const doExportToExcel = (activitiesToExport: Activity[]) => {
    const workbook = XLSX.utils.book_new();
    
    // ===== ABA RESUMO (igual primeira página do PDF) =====
    const resumoData: (string | number)[][] = [];
    
    // Cabeçalho
    resumoData.push(['RELATÓRIO DE ATIVIDADES - RDA']);
    resumoData.push([`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`]);
    resumoData.push([`Total de registros: ${activitiesToExport.length}`]);
    if (dataInicio || dataFim) {
      resumoData.push([`Período: ${dataInicio || 'início'} até ${dataFim || 'fim'}`]);
    }
    resumoData.push([]); // linha vazia
    
    // Cabeçalho da tabela
    resumoData.push(['Data', 'Dia', 'Cód.', 'Obra', 'Fiscal', 'Contratada', 'Clima M/T/N', 'Pratic.', 'Efet.', 'Equip.', 'Atividades']);
    
    // Dados
    activitiesToExport.forEach((a) => {
      resumoData.push([
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
        a.atividades,
      ]);
    });
    
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
    
    // Merge para título
    const mergeEnd = dataInicio || dataFim ? 3 : 2;
    resumoSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // Gerado em
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }, // Total
    ];
    if (dataInicio || dataFim) {
      resumoSheet['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 10 } }); // Período
    }
    
    resumoSheet['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 25 }, { wch: 40 },
      { wch: 15 }, { wch: 16 }, { wch: 8 }, { wch: 6 }, { wch: 7 }, { wch: 80 },
    ];
    
    XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
    
    // ===== ABAS INDIVIDUAIS (igual páginas detalhadas do PDF) =====
    activitiesToExport.forEach((a, index) => {
      const sheetData: (string | number)[][] = [];
      
      // Título
      sheetData.push([`RDA - ${a.data} - ${a.obra}`]);
      sheetData.push([]); // linha vazia
      
      // Info grid
      sheetData.push(['Código:', a.codigo || 'RD', '', 'Área:', a.area || '-', '', 'CN:', a.cn || '-']);
      sheetData.push(['Fiscal:', a.fiscal]);
      sheetData.push(['Cliente:', a.cliente || '-', '', 'Contratada:', a.contratada]);
      sheetData.push(['Dia:', a.dia]);
      sheetData.push([]); // linha vazia
      
      // Condições de tempo
      sheetData.push(['CONDIÇÕES DE TEMPO']);
      sheetData.push(['Temperatura:', `${a.temperatura || '-'}ºC`, '', 'Manhã:', a.condicaoManha || '-', '', 'Tarde:', a.condicaoTarde || '-', '', 'Noite:', a.condicaoNoite || '-']);
      sheetData.push(['Praticável:', a.praticavel ? 'SIM' : 'NÃO', '', 'Volume Chuva:', `${a.volumeChuva || 0}mm`]);
      sheetData.push([]); // linha vazia
      
      // Efetivo
      sheetData.push(['EFETIVO']);
      if (a.efetivoDetalhado && a.efetivoDetalhado.length > 0) {
        a.efetivoDetalhado.forEach((e) => {
          sheetData.push([`• ${e.funcao}:`, e.quantidade]);
        });
      }
      sheetData.push(['Total:', `${a.efetivoTotal} pessoas`]);
      sheetData.push([]); // linha vazia
      
      // Equipamentos
      sheetData.push(['EQUIPAMENTOS']);
      if (a.equipamentosDetalhado && a.equipamentosDetalhado.length > 0) {
        a.equipamentosDetalhado.forEach((e) => {
          sheetData.push([`• ${e.equipamento}:`, e.quantidade]);
        });
      }
      sheetData.push(['Total:', `${a.equipamentos} equipamentos`]);
      sheetData.push([]); // linha vazia
      
      // Atividades
      sheetData.push(['ATIVIDADES:']);
      sheetData.push([a.atividades]);
      sheetData.push([]); // linha vazia
      
      // Observações
      if (a.observacoes && a.observacoes.trim()) {
        sheetData.push(['OBSERVAÇÕES:']);
        sheetData.push([a.observacoes]);
        sheetData.push([]); // linha vazia
      }
      
      // Ocorrências
      if (a.ocorrencias && a.ocorrencias.trim()) {
        sheetData.push(['OCORRÊNCIAS:']);
        sheetData.push([a.ocorrencias]);
        sheetData.push([]); // linha vazia
      }
      
      // Localização (se existir)
      if (a.localizacao) {
        const loc = a.localizacao;
        sheetData.push(['LOCALIZAÇÃO:']);
        if (loc.kmInicial || loc.kmFinal) {
          sheetData.push(['Km Inicial:', loc.kmInicial || '-', '', 'Km Final:', loc.kmFinal || '-']);
        }
        if (loc.estacaInicial || loc.estacaFinal) {
          sheetData.push(['Estaca Inicial:', loc.estacaInicial || '-', '', 'Estaca Final:', loc.estacaFinal || '-']);
        }
        if (loc.lado) {
          sheetData.push(['Lado:', loc.lado]);
        }
        if (loc.faixa) {
          sheetData.push(['Faixa:', loc.faixa]);
        }
        sheetData.push([]); // linha vazia
      }
      
      // Número da página
      sheetData.push([`Página ${index + 2} de ${activitiesToExport.length + 1}`]);
      
      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      sheet['!cols'] = [
        { wch: 15 }, { wch: 40 }, { wch: 3 }, { wch: 15 }, { wch: 30 },
        { wch: 3 }, { wch: 10 }, { wch: 15 }, { wch: 3 }, { wch: 10 }, { wch: 15 },
      ];
      
      // Nome da aba (máx 31 caracteres no Excel)
      const sheetName = `${index + 1}-${a.data}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    const fileName = `RDAs-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Exportado para Excel com sucesso!');
  };

  const doExportToPDF = (activitiesToExport: Activity[]) => {
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.text('RELATÓRIO DE ATIVIDADES - RDA', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    doc.text(`Total de registros: ${activitiesToExport.length}`, 14, 36);
    
    let startY = 42;
    if (dataInicio || dataFim) {
      doc.text(`Período: ${dataInicio || 'início'} até ${dataFim || 'fim'}`, 14, 42);
      startY = 48;
    }

    const summaryTableData = activitiesToExport.map((a) => [
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
      startY,
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
    activitiesToExport.forEach((a, index) => {
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
      doc.text(`Página ${index + 2} de ${activitiesToExport.length + 1}`, pageWidth - 30, pageHeight - 10);
    });

    const fileName = `RDAs-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    toast.success('Exportado para PDF com sucesso!');
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => openExportDialog('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => openExportDialog('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Exportar {exportType === 'excel' ? 'Excel' : 'PDF'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredActivities.length} de {activities.length} atividades no período selecionado
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={filteredActivities.length === 0}>
              {exportType === 'excel' ? (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
