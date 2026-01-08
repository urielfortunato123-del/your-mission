import { useState, useRef } from 'react';
import { PriceItem } from '@/types/pricing';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Plus, Trash2, Search, FileSpreadsheet, Edit2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

const UNIDADES = ['un', 'm', 'm²', 'm³', 'kg', 'l', 'ton', 'vb', 'h', 'cj', 'pç', 'cx', 'sc', 'gl', 'km', 'ha'];

interface PriceSheetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceItems: PriceItem[];
  onImport: (file: File) => Promise<{ added: number; errors: string[] }>;
  onAdd: (item: Omit<PriceItem, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<PriceItem>) => void;
  onDelete: (id: string) => void;
}

const defaultItem: Omit<PriceItem, 'id' | 'createdAt'> & { quantidade: number } = {
  codigo: '',
  descricao: '',
  unidade: 'un',
  precoUnitario: 0,
  quantidade: 1,
  categoria: '',
  fonte: '',
};

export function PriceSheetManager({
  open,
  onOpenChange,
  priceItems,
  onImport,
  onAdd,
  onUpdate,
  onDelete,
}: PriceSheetManagerProps) {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultItem);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = priceItems.filter(item => {
    const term = search.toLowerCase();
    return (
      item.codigo.toLowerCase().includes(term) ||
      item.descricao.toLowerCase().includes(term) ||
      item.categoria?.toLowerCase().includes(term)
    );
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await onImport(file);
      toast.success(`${result.added} itens importados!`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} linhas com problemas`);
        console.log('Erros de importação:', result.errors);
      }
    } catch (error) {
      toast.error('Erro ao importar planilha');
      console.error(error);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setIsImportingPdf(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      // Call edge function to extract price items from PDF
      const { data, error } = await supabase.functions.invoke('extract-price-sheet', {
        body: { fileBase64, isPdf: true }
      });

      if (error) throw error;

      if (data?.items && Array.isArray(data.items)) {
        let addedCount = 0;
        data.items.forEach((item: any) => {
          if (item.codigo && item.descricao) {
            onAdd({
              codigo: String(item.codigo).toUpperCase().trim(),
              descricao: String(item.descricao).trim(),
              unidade: String(item.unidade || 'un').trim(),
              precoUnitario: parseFloat(item.precoUnitario) || 0,
              categoria: String(item.categoria || '').trim(),
              fonte: String(item.fonte || 'PDF Import').trim(),
            });
            addedCount++;
          }
        });
        toast.success(`${addedCount} itens extraídos do PDF!`);
      } else {
        toast.error('Não foi possível extrair itens do PDF');
      }
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      toast.error('Erro ao processar PDF. Tente um arquivo Excel/CSV.');
    } finally {
      setIsImportingPdf(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    if (!formData.codigo || !formData.descricao) {
      toast.error('Código e descrição são obrigatórios');
      return;
    }

    if (editingId) {
      onUpdate(editingId, formData);
      toast.success('Item atualizado');
    } else {
      onAdd(formData);
      toast.success('Item adicionado');
    }

    setFormData(defaultItem);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (item: PriceItem) => {
    setFormData({
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      precoUnitario: item.precoUnitario,
      quantidade: 1,
      categoria: item.categoria || '',
      fonte: item.fonte || '',
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData(defaultItem);
    setIsAdding(false);
    setEditingId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Planilha de Preços
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <input
                type="file"
                ref={pdfInputRef}
                onChange={handlePdfUpload}
                accept=".pdf"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || isImportingPdf}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importando...' : 'Excel/CSV'}
              </Button>
              <Button
                variant="outline"
                onClick={() => pdfInputRef.current?.click()}
                disabled={isImporting || isImportingPdf}
              >
                {isImportingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {isImportingPdf ? 'Extraindo...' : 'PDF (IA)'}
              </Button>
              <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar código ou descrição..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Add/Edit Form */}
          {isAdding && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <h4 className="font-medium">
                {editingId ? 'Editar Item' : 'Novo Item'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder="BSO-01"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Revestimento em argamassa"
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select 
                    value={formData.unidade} 
                    onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {UNIDADES.map((un) => (
                        <SelectItem key={un} value={un}>{un}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseFloat(e.target.value) || 0 })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Preço Unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precoUnitario}
                    onChange={(e) => setFormData({ ...formData, precoUnitario: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Pavimentação"
                  />
                </div>
                <div>
                  <Label>Fonte</Label>
                  <Input
                    value={formData.fonte}
                    onChange={(e) => setFormData({ ...formData, fonte: e.target.value })}
                    placeholder="DER-SP, DNIT, SINAPI"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleSave}>Salvar</Button>
                  <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <strong>Formato da planilha:</strong> Colunas na ordem: Código, Descrição, Unidade, Preço Unitário, Categoria (opcional), Fonte (opcional)
          </div>

          {/* Table */}
          <ScrollArea className="h-[350px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[80px]">Unidade</TableHead>
                  <TableHead className="w-[120px] text-right">Preço Unit.</TableHead>
                  <TableHead className="w-[100px]">Categoria</TableHead>
                  <TableHead className="w-[80px]">Fonte</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {priceItems.length === 0
                        ? 'Nenhum item cadastrado. Importe uma planilha ou adicione manualmente.'
                        : 'Nenhum item encontrado com esse filtro.'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {item.codigo}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.descricao}>
                        {item.descricao}
                      </TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.precoUnitario)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.categoria || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.fonte || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            Total: {priceItems.length} itens cadastrados
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
