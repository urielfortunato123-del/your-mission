import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Activity } from '@/types/activity';

interface ImportExcelProps {
  onImport: (activities: Omit<Activity, 'id' | 'createdAt'>[]) => void;
}

export function ImportExcel({ onImport }: ImportExcelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDate = (value: unknown): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    
    // Handle Excel date serial number
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    
    // Handle string date formats
    if (typeof value === 'string') {
      // Try DD/MM/YYYY format
      const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) {
        return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
      }
      
      // Try YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const normalizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, ''); // Remove special chars
  };

  const findColumn = (row: Record<string, unknown>, possibleNames: string[]): unknown => {
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeColumnName(key);
      for (const name of possibleNames) {
        if (normalizedKey.includes(normalizeColumnName(name))) {
          return row[key];
        }
      }
    }
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV');
      return;
    }

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
      
      if (rows.length === 0) {
        toast.error('Planilha vazia ou formato não reconhecido');
        setIsProcessing(false);
        return;
      }

      console.log('Parsed rows:', rows);

      // Map rows to activities
      const activities: Omit<Activity, 'id' | 'createdAt'>[] = rows
        .filter((row) => {
          // Skip empty rows or header rows
          const hasData = Object.values(row).some(
            (v) => v !== null && v !== undefined && String(v).trim() !== ''
          );
          return hasData;
        })
        .map((row) => {
          const data = parseDate(
            findColumn(row, ['data', 'date', 'dia'])
          );
          
          const contratada = String(
            findColumn(row, ['contratada', 'empreiteira', 'empresa', 'contractor']) || ''
          ).trim();
          
          const obra = String(
            findColumn(row, ['obra', 'local', 'projeto', 'work', 'trecho']) || ''
          ).trim();
          
          const atividades = String(
            findColumn(row, ['atividades', 'atividade', 'descricao', 'activities', 'servico']) || ''
          ).trim();
          
          const observacoes = String(
            findColumn(row, ['observacoes', 'obs', 'observacao', 'notas', 'medicao']) || ''
          ).trim();
          
          const fiscal = String(
            findColumn(row, ['fiscal', 'responsavel', 'engenheiro', 'supervisor']) || ''
          ).trim();
          
          const frenteObra = String(
            findColumn(row, ['frente', 'local', 'localizacao', 'pista', 'faixa']) || ''
          ).trim();
          
          const efetivoRaw = findColumn(row, ['efetivo', 'mao de obra', 'funcionarios', 'equipe']);
          const efetivoTotal = typeof efetivoRaw === 'number' 
            ? efetivoRaw 
            : parseInt(String(efetivoRaw || '0')) || 0;
          
          const equipRaw = findColumn(row, ['equipamentos', 'equipamento', 'maquinas']);
          const equipamentos = typeof equipRaw === 'number' 
            ? equipRaw 
            : parseInt(String(equipRaw || '0')) || 0;

          return {
            data,
            dia: '',
            fiscal,
            contratada,
            obra,
            frenteObra,
            condicoesClima: 'Bom',
            efetivoTotal,
            equipamentos,
            atividades,
            observacoes,
          };
        })
        .filter((a) => a.contratada || a.atividades || a.obra); // Filter out empty entries

      if (activities.length === 0) {
        toast.error('Nenhum registro válido encontrado na planilha');
        setIsProcessing(false);
        return;
      }

      onImport(activities);
      toast.success(`${activities.length} registro(s) importado(s) com sucesso!`);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Erro ao processar arquivo. Verifique o formato.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        ref={fileInputRef}
        className="hidden"
        disabled={isProcessing}
      />
      
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4" />
            Importar RDO/RDA
          </>
        )}
      </Button>
    </div>
  );
}
