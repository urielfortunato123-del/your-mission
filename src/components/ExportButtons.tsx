import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, FileText, Filter } from 'lucide-react';
import { Activity } from '@/types/activity';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
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

  const doExportToExcel = async (activitiesToExport: Activity[]) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema RDA';
    workbook.created = new Date();

    // Estilos padrão
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

    const sectionHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } },
    };

    const labelStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 10 },
    };

    const missingDataStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 10, color: { argb: 'FFFF0000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    };

    // Helper para verificar se tem dado e aplicar estilo vermelho se não tiver
    const getMissingText = (value: string | number | undefined | null, placeholder: string): { value: string; isMissing: boolean } => {
      if (value === undefined || value === null || value === '' || value === '-' || value === 0) {
        return { value: placeholder, isMissing: true };
      }
      return { value: String(value), isMissing: false };
    };

    // ===== ABA RESUMO =====
    const resumoSheet = workbook.addWorksheet('Resumo');
    
    // Larguras das colunas (14 colunas agora)
    resumoSheet.columns = [
      { width: 12 }, { width: 14 }, { width: 8 }, { width: 25 }, { width: 40 },
      { width: 15 }, { width: 18 }, { width: 10 }, { width: 8 }, { width: 8 }, { width: 50 },
      { width: 20 }, { width: 15 }, { width: 25 },
    ];

    // Título
    let rowNum = 1;
    resumoSheet.mergeCells(`A${rowNum}:N${rowNum}`);
    const titleCell = resumoSheet.getCell(`A${rowNum}`);
    titleCell.value = 'RELATÓRIO DE ATIVIDADES - RDA';
    titleCell.style = titleStyle;
    resumoSheet.getRow(rowNum).height = 30;

    rowNum++;
    resumoSheet.mergeCells(`A${rowNum}:N${rowNum}`);
    resumoSheet.getCell(`A${rowNum}`).value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
    resumoSheet.getCell(`A${rowNum}`).font = { italic: true };

    rowNum++;
    resumoSheet.mergeCells(`A${rowNum}:N${rowNum}`);
    resumoSheet.getCell(`A${rowNum}`).value = `Total de registros: ${activitiesToExport.length}`;
    resumoSheet.getCell(`A${rowNum}`).font = { bold: true };

    if (dataInicio || dataFim) {
      rowNum++;
      resumoSheet.mergeCells(`A${rowNum}:N${rowNum}`);
      resumoSheet.getCell(`A${rowNum}`).value = `Período: ${dataInicio || 'início'} até ${dataFim || 'fim'}`;
    }

    rowNum += 2;
    
    // Cabeçalho da tabela (14 colunas)
    const headers = ['Data', 'Dia', 'Cód.', 'Obra', 'Fiscal', 'Contratada', 'Clima M/T/N', 'Pratic.', 'Efet.', 'Equip.', 'Atividades', 'Quantidade Verificada', 'Valor Unitário', 'Valor Total'];
    const headerRow = resumoSheet.getRow(rowNum);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });
    headerRow.height = 20;

    // Dados
    activitiesToExport.forEach((a) => {
      rowNum++;
      const dataRow = resumoSheet.getRow(rowNum);
      
      // Verificar campos que podem estar faltando
      const fiscalData = getMissingText(a.fiscal, 'SEM FISCAL');
      const contratadaData = getMissingText(a.contratada, 'SEM CONTRATADA');
      const climaManha = a.condicaoManha || '-';
      const climaTarde = a.condicaoTarde || '-';
      const climaNoite = a.condicaoNoite || '-';
      const climaCompleto = `${climaManha}/${climaTarde}/${climaNoite}`;
      const efetivoData = getMissingText(a.efetivoTotal, 'SEM INFO');
      const equipData = getMissingText(a.equipamentos, 'SEM INFO');
      const atividadesData = getMissingText(a.atividades, 'SEM ATIVIDADES');
      
      // Campos de medição - sempre mostram texto em vermelho se não tiver info
      const qtdVerificada = getMissingText(a.quantidadeVerificada, 'n tem informação');
      const valorUnitario = getMissingText(a.valorUnitario, 'verificar bm');
      const valorTotal = getMissingText(a.valorTotal, 'quantidade verificada*valor unitario');
      
      const values = [
        { value: a.data, isMissing: false },
        { value: a.dia, isMissing: false },
        { value: a.codigo || 'RD', isMissing: false },
        { value: a.obra, isMissing: !a.obra },
        fiscalData,
        contratadaData,
        { value: climaCompleto, isMissing: climaManha === '-' && climaTarde === '-' && climaNoite === '-' },
        { value: a.praticavel ? 'SIM' : 'NÃO', isMissing: false },
        efetivoData,
        equipData,
        { value: atividadesData.isMissing ? atividadesData.value : (a.atividades.length > 100 ? a.atividades.substring(0, 100) + '...' : a.atividades), isMissing: atividadesData.isMissing },
        qtdVerificada,
        valorUnitario,
        valorTotal,
      ];
      
      values.forEach((v, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = v.value;
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (v.isMissing) {
          cell.font = { bold: true, color: { argb: 'FFFF0000' } };
        }
      });
    });

    // ===== ABAS INDIVIDUAIS =====
    activitiesToExport.forEach((a, index) => {
      const sheetName = `${index + 1}-${a.data}`.substring(0, 31);
      const sheet = workbook.addWorksheet(sheetName);
      
      sheet.columns = [
        { width: 15 }, { width: 35 }, { width: 5 }, { width: 15 }, { width: 30 },
        { width: 5 }, { width: 12 }, { width: 20 }, { width: 5 }, { width: 12 }, { width: 20 },
      ];

      let row = 1;

      // Título
      sheet.mergeCells(`A${row}:K${row}`);
      const titleCell = sheet.getCell(`A${row}`);
      titleCell.value = `RDA - ${a.data} - ${a.obra}`;
      titleCell.style = titleStyle;
      sheet.getRow(row).height = 28;

      row += 2;

      // Info grid
      sheet.getCell(`A${row}`).value = 'Código:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = a.codigo || 'RD';
      sheet.getCell(`D${row}`).value = 'Área:';
      sheet.getCell(`D${row}`).style = labelStyle;
      sheet.getCell(`E${row}`).value = a.area || '-';
      sheet.getCell(`G${row}`).value = 'CN:';
      sheet.getCell(`G${row}`).style = labelStyle;
      sheet.getCell(`H${row}`).value = a.cn || '-';

      row++;
      sheet.getCell(`A${row}`).value = 'Fiscal:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.mergeCells(`B${row}:E${row}`);
      sheet.getCell(`B${row}`).value = a.fiscal;

      row++;
      sheet.getCell(`A${row}`).value = 'Cliente:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = a.cliente || '-';
      sheet.getCell(`D${row}`).value = 'Contratada:';
      sheet.getCell(`D${row}`).style = labelStyle;
      sheet.getCell(`E${row}`).value = a.contratada;

      row++;
      sheet.getCell(`A${row}`).value = 'Dia:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = a.dia;

      row += 2;

      // Condições de tempo
      sheet.mergeCells(`A${row}:K${row}`);
      sheet.getCell(`A${row}`).value = 'CONDIÇÕES DE TEMPO';
      sheet.getCell(`A${row}`).style = sectionHeaderStyle;
      sheet.getRow(row).height = 20;

      row++;
      sheet.getCell(`A${row}`).value = 'Temperatura:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = `${a.temperatura || '-'}ºC`;
      sheet.getCell(`D${row}`).value = 'Manhã:';
      sheet.getCell(`D${row}`).style = labelStyle;
      sheet.getCell(`E${row}`).value = a.condicaoManha || '-';
      sheet.getCell(`G${row}`).value = 'Tarde:';
      sheet.getCell(`G${row}`).style = labelStyle;
      sheet.getCell(`H${row}`).value = a.condicaoTarde || '-';
      sheet.getCell(`J${row}`).value = 'Noite:';
      sheet.getCell(`J${row}`).style = labelStyle;
      sheet.getCell(`K${row}`).value = a.condicaoNoite || '-';

      row++;
      sheet.getCell(`A${row}`).value = 'Praticável:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = a.praticavel ? 'SIM' : 'NÃO';
      sheet.getCell(`D${row}`).value = 'Volume Chuva:';
      sheet.getCell(`D${row}`).style = labelStyle;
      sheet.getCell(`E${row}`).value = `${a.volumeChuva || 0}mm`;

      row += 2;

      // Efetivo
      sheet.mergeCells(`A${row}:E${row}`);
      sheet.getCell(`A${row}`).value = 'EFETIVO';
      sheet.getCell(`A${row}`).style = {
        ...sectionHeaderStyle,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F5FF' } },
      };

      if (a.efetivoDetalhado && a.efetivoDetalhado.length > 0) {
        a.efetivoDetalhado.forEach((e) => {
          row++;
          sheet.getCell(`A${row}`).value = `• ${e.funcao}:`;
          sheet.getCell(`B${row}`).value = e.quantidade;
        });
      }
      row++;
      sheet.getCell(`A${row}`).value = 'Total:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = `${a.efetivoTotal} pessoas`;

      row += 2;

      // Equipamentos
      sheet.mergeCells(`A${row}:E${row}`);
      sheet.getCell(`A${row}`).value = 'EQUIPAMENTOS';
      sheet.getCell(`A${row}`).style = {
        ...sectionHeaderStyle,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } },
      };

      if (a.equipamentosDetalhado && a.equipamentosDetalhado.length > 0) {
        a.equipamentosDetalhado.forEach((e) => {
          row++;
          sheet.getCell(`A${row}`).value = `• ${e.equipamento}:`;
          sheet.getCell(`B${row}`).value = e.quantidade;
        });
      }
      row++;
      sheet.getCell(`A${row}`).value = 'Total:';
      sheet.getCell(`A${row}`).style = labelStyle;
      sheet.getCell(`B${row}`).value = `${a.equipamentos} equipamentos`;

      row += 2;

      // Atividades
      sheet.mergeCells(`A${row}:K${row}`);
      sheet.getCell(`A${row}`).value = 'ATIVIDADES:';
      sheet.getCell(`A${row}`).style = sectionHeaderStyle;

      row++;
      sheet.mergeCells(`A${row}:K${row}`);
      sheet.getCell(`A${row}`).value = a.atividades;
      sheet.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' };
      sheet.getRow(row).height = Math.max(30, Math.ceil(a.atividades.length / 100) * 15);

      // Observações
      if (a.observacoes && a.observacoes.trim()) {
        row += 2;
        sheet.mergeCells(`A${row}:K${row}`);
        sheet.getCell(`A${row}`).value = 'OBSERVAÇÕES:';
        sheet.getCell(`A${row}`).style = sectionHeaderStyle;

        row++;
        sheet.mergeCells(`A${row}:K${row}`);
        sheet.getCell(`A${row}`).value = a.observacoes;
        sheet.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' };
      }

      // Ocorrências
      if (a.ocorrencias && a.ocorrencias.trim()) {
        row += 2;
        sheet.mergeCells(`A${row}:K${row}`);
        sheet.getCell(`A${row}`).value = 'OCORRÊNCIAS:';
        sheet.getCell(`A${row}`).style = sectionHeaderStyle;

        row++;
        sheet.mergeCells(`A${row}:K${row}`);
        sheet.getCell(`A${row}`).value = a.ocorrencias;
        sheet.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' };
      }

      // Localização
      if (a.localizacao && (a.localizacao.kmInicial || a.localizacao.kmFinal || a.localizacao.estacaInicial)) {
        row += 2;
        sheet.mergeCells(`A${row}:K${row}`);
        sheet.getCell(`A${row}`).value = 'LOCALIZAÇÃO:';
        sheet.getCell(`A${row}`).style = sectionHeaderStyle;

        const loc = a.localizacao;
        if (loc.kmInicial || loc.kmFinal) {
          row++;
          sheet.getCell(`A${row}`).value = 'Km Inicial:';
          sheet.getCell(`A${row}`).style = labelStyle;
          sheet.getCell(`B${row}`).value = loc.kmInicial || '-';
          sheet.getCell(`D${row}`).value = 'Km Final:';
          sheet.getCell(`D${row}`).style = labelStyle;
          sheet.getCell(`E${row}`).value = loc.kmFinal || '-';
        }
        if (loc.lado) {
          row++;
          sheet.getCell(`A${row}`).value = 'Lado:';
          sheet.getCell(`A${row}`).style = labelStyle;
          sheet.getCell(`B${row}`).value = loc.lado;
        }
      }

      // Medições Manuais
      if (a.medicoesManual && a.medicoesManual.length > 0) {
        row += 2;
        sheet.mergeCells(`A${row}:K${row}`);
        sheet.getCell(`A${row}`).value = 'MEDIÇÕES MANUAIS:';
        sheet.getCell(`A${row}`).style = {
          ...sectionHeaderStyle,
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFE6' } },
        };

        // Cabeçalho da tabela de medições
        row++;
        const medicaoHeaders = ['Descrição', 'Km Inicial', 'Km Final', 'Distância', 'Largura', 'Altura', 'Área', 'Volume', 'Tonelada', 'Faixa', 'Sentido'];
        medicaoHeaders.forEach((h, i) => {
          const cell = sheet.getCell(row, i + 1);
          cell.value = h;
          cell.style = headerStyle;
        });

        // Dados das medições
        a.medicoesManual.forEach((med) => {
          row++;
          const medicaoValues = [
            med.descricao || '-',
            med.kmInicial || '-',
            med.kmFinal || '-',
            med.distancia || '-',
            med.largura || '-',
            med.altura || '-',
            med.area || '-',
            med.volume || '-',
            med.tonelada || '-',
            med.faixa || '-',
            med.sentido || '-',
          ];
          medicaoValues.forEach((v, i) => {
            const cell = sheet.getCell(row, i + 1);
            cell.value = v;
            cell.border = cellBorder;
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
        });

        // Totais das medições
        row++;
        const totalDistancia = a.medicoesManual.reduce((sum, m) => sum + (parseFloat(m.distancia?.replace(',', '.') || '0') || 0), 0);
        const totalArea = a.medicoesManual.reduce((sum, m) => sum + (parseFloat(m.area?.replace(',', '.') || '0') || 0), 0);
        const totalVolume = a.medicoesManual.reduce((sum, m) => sum + (parseFloat(m.volume?.replace(',', '.') || '0') || 0), 0);
        const totalTonelada = a.medicoesManual.reduce((sum, m) => sum + (parseFloat(m.tonelada?.replace(',', '.') || '0') || 0), 0);
        
        sheet.getCell(row, 1).value = 'TOTAIS:';
        sheet.getCell(row, 1).style = labelStyle;
        sheet.getCell(row, 4).value = totalDistancia.toFixed(2).replace('.', ',');
        sheet.getCell(row, 4).style = labelStyle;
        sheet.getCell(row, 7).value = totalArea.toFixed(2).replace('.', ',');
        sheet.getCell(row, 7).style = labelStyle;
        sheet.getCell(row, 8).value = totalVolume.toFixed(2).replace('.', ',');
        sheet.getCell(row, 8).style = labelStyle;
        sheet.getCell(row, 9).value = totalTonelada.toFixed(2).replace('.', ',');
        sheet.getCell(row, 9).style = labelStyle;
      }

      // Rodapé
      row += 2;
      sheet.getCell(`A${row}`).value = `Página ${index + 2} de ${activitiesToExport.length + 1}`;
      sheet.getCell(`A${row}`).font = { italic: true, size: 9 };
    });

    // ===== ABA DE MEDIÇÕES CONSOLIDADAS =====
    const allMedicoes: Array<{ data: string; obra: string; medicao: typeof activitiesToExport[0]['medicoesManual'][0] }> = [];
    activitiesToExport.forEach((a) => {
      if (a.medicoesManual && a.medicoesManual.length > 0) {
        a.medicoesManual.forEach((m) => {
          allMedicoes.push({ data: a.data, obra: a.obra, medicao: m });
        });
      }
    });

    if (allMedicoes.length > 0) {
      const medicoesSheet = workbook.addWorksheet('Medições');
      
      medicoesSheet.columns = [
        { width: 12 }, { width: 25 }, { width: 30 }, { width: 12 }, { width: 12 },
        { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 },
        { width: 10 }, { width: 10 }, { width: 15 }, { width: 15 },
      ];

      // Título
      let medRow = 1;
      medicoesSheet.mergeCells(`A${medRow}:N${medRow}`);
      const medTitleCell = medicoesSheet.getCell(`A${medRow}`);
      medTitleCell.value = 'CONSOLIDADO DE MEDIÇÕES MANUAIS';
      medTitleCell.style = titleStyle;
      medicoesSheet.getRow(medRow).height = 30;

      medRow++;
      medicoesSheet.getCell(`A${medRow}`).value = `Total de medições: ${allMedicoes.length}`;
      medicoesSheet.getCell(`A${medRow}`).font = { bold: true };

      medRow += 2;
      
      // Cabeçalho
      const medHeaders = ['Data', 'Obra', 'Descrição', 'Km Inicial', 'Km Final', 'Distância', 'Largura', 'Altura', 'Área', 'Volume', 'Tonelada', 'Faixa', 'Sentido', 'Material'];
      const medHeaderRow = medicoesSheet.getRow(medRow);
      medHeaders.forEach((h, i) => {
        const cell = medHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.style = headerStyle;
      });
      medHeaderRow.height = 20;

      // Dados
      allMedicoes.forEach((item) => {
        medRow++;
        const med = item.medicao;
        const values = [
          item.data,
          item.obra,
          med.descricao || '-',
          med.kmInicial || '-',
          med.kmFinal || '-',
          med.distancia || '-',
          med.largura || '-',
          med.altura || '-',
          med.area || '-',
          med.volume || '-',
          med.tonelada || '-',
          med.faixa || '-',
          med.sentido || '-',
          med.material || '-',
        ];
        values.forEach((v, i) => {
          const cell = medicoesSheet.getCell(medRow, i + 1);
          cell.value = v;
          cell.border = cellBorder;
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      // Linha de totais
      medRow += 2;
      medicoesSheet.getCell(medRow, 1).value = 'TOTAIS:';
      medicoesSheet.getCell(medRow, 1).style = labelStyle;
      
      const totalDistancia = allMedicoes.reduce((sum, m) => sum + (parseFloat(m.medicao.distancia?.replace(',', '.') || '0') || 0), 0);
      const totalArea = allMedicoes.reduce((sum, m) => sum + (parseFloat(m.medicao.area?.replace(',', '.') || '0') || 0), 0);
      const totalVolume = allMedicoes.reduce((sum, m) => sum + (parseFloat(m.medicao.volume?.replace(',', '.') || '0') || 0), 0);
      const totalTonelada = allMedicoes.reduce((sum, m) => sum + (parseFloat(m.medicao.tonelada?.replace(',', '.') || '0') || 0), 0);

      medicoesSheet.getCell(medRow, 6).value = totalDistancia.toFixed(2).replace('.', ',');
      medicoesSheet.getCell(medRow, 6).style = labelStyle;
      medicoesSheet.getCell(medRow, 9).value = totalArea.toFixed(2).replace('.', ',');
      medicoesSheet.getCell(medRow, 9).style = labelStyle;
      medicoesSheet.getCell(medRow, 10).value = totalVolume.toFixed(2).replace('.', ',');
      medicoesSheet.getCell(medRow, 10).style = labelStyle;
      medicoesSheet.getCell(medRow, 11).value = totalTonelada.toFixed(2).replace('.', ',');
      medicoesSheet.getCell(medRow, 11).style = labelStyle;
    }

    // Gerar arquivo e baixar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RDAs-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    
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
