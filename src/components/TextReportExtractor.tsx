import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, Download, Plus, Trash2, ClipboardPaste } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExtractedActivity {
  data: string | null;
  diaSemana: string | null;
  fiscal: string | null;
  contratada: string | null;
  obra: string | null;
  frenteTrabalho: string | null;
  area: string | null;
  atividades: string | null;
  observacoes: string | null;
  responsavel: string | null;
  materiais: string | null;
  quantidades: string | null;
}

interface ExtractionResult {
  atividades: ExtractedActivity[];
  resumo: {
    dataRelatorio: string | null;
    totalAtividades: number;
    fiscais: string[];
    obras: string[];
    equipes: string[];
  };
}

interface TextReportExtractorProps {
  onAddActivities?: (activities: ExtractedActivity[]) => void;
}

export function TextReportExtractor({ onAddActivities }: TextReportExtractorProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      toast.success('Texto colado da área de transferência');
    } catch {
      toast.error('Não foi possível acessar a área de transferência');
    }
  };

  const handleExtract = async () => {
    if (!text.trim()) {
      toast.error('Cole ou digite o texto do relatório');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('extract-text-report', {
        body: { text }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setResult(data.data);
        setSelectedRows(new Set(data.data.atividades?.map((_: ExtractedActivity, i: number) => i) || []));
        toast.success(`${data.data.atividades?.length || 0} atividades extraídas`);
      } else {
        throw new Error(data?.error || 'Erro na extração');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Erro ao extrair dados do texto');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === result?.atividades?.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(result?.atividades?.map((_, i) => i) || []));
    }
  };

  const exportToExcel = () => {
    if (!result?.atividades?.length) return;

    const selectedActivities = result.atividades.filter((_, i) => selectedRows.has(i));
    
    const wsData = selectedActivities.map(a => ({
      'Data': a.data || '',
      'Dia': a.diaSemana || '',
      'Fiscal': a.fiscal || '',
      'Contratada/Equipe': a.contratada || '',
      'Obra': a.obra || '',
      'Frente de Trabalho': a.frenteTrabalho || '',
      'Área': a.area || '',
      'Atividades': a.atividades || '',
      'Responsável': a.responsavel || '',
      'Materiais': a.materiais || '',
      'Quantidades': a.quantidades || '',
      'Observações': a.observacoes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Atividades');
    
    const fileName = `atividades_${result.resumo?.dataRelatorio || new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Planilha exportada com sucesso');
  };

  const handleAddToSystem = () => {
    if (!result?.atividades?.length || !onAddActivities) return;
    
    const selectedActivities = result.atividades.filter((_, i) => selectedRows.has(i));
    onAddActivities(selectedActivities);
    toast.success(`${selectedActivities.length} atividades adicionadas ao sistema`);
    setOpen(false);
    setText('');
    setResult(null);
  };

  const clearResult = () => {
    setResult(null);
    setSelectedRows(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Extrair de Texto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extrair Atividades de Texto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePaste} className="gap-2">
                  <ClipboardPaste className="h-4 w-4" />
                  Colar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setText('')}
                  disabled={!text}
                >
                  Limpar
                </Button>
              </div>

              <Textarea
                placeholder="Cole aqui o texto do relatório de atividades..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {text.length} caracteres
                </span>
                <Button 
                  onClick={handleExtract} 
                  disabled={isLoading || !text.trim()}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extraindo...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Extrair Dados
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Resumo */}
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="outline">
                  📅 {result.resumo?.dataRelatorio || 'Data não identificada'}
                </Badge>
                <Badge variant="secondary">
                  {result.resumo?.totalAtividades || result.atividades?.length || 0} atividades
                </Badge>
                {result.resumo?.fiscais?.map((f, i) => (
                  <Badge key={i} variant="outline">👷 {f}</Badge>
                ))}
                {result.resumo?.obras?.slice(0, 5).map((o, i) => (
                  <Badge key={i} variant="outline">🏗️ {o}</Badge>
                ))}
              </div>

              {/* Tabela de resultados */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input 
                          type="checkbox" 
                          checked={selectedRows.size === result.atividades?.length}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead className="w-24">Data</TableHead>
                      <TableHead>Fiscal</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="min-w-[200px]">Atividade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.atividades?.map((atividade, index) => (
                      <TableRow 
                        key={index}
                        className={selectedRows.has(index) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedRows.has(index)}
                            onChange={() => toggleRow(index)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {atividade.data || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {atividade.fiscal || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {atividade.contratada || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {atividade.obra || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {atividade.frenteTrabalho || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="max-w-[300px] truncate" title={atividade.atividades || ''}>
                            {atividade.atividades || '-'}
                          </div>
                          {atividade.materiais && (
                            <div className="text-xs text-muted-foreground mt-1">
                              📦 {atividade.materiais}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Ações */}
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearResult} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Voltar
                  </Button>
                  <span className="text-sm text-muted-foreground self-center">
                    {selectedRows.size} selecionadas
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={exportToExcel}
                    disabled={selectedRows.size === 0}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  {onAddActivities && (
                    <Button 
                      onClick={handleAddToSystem}
                      disabled={selectedRows.size === 0}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar ao Sistema
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
