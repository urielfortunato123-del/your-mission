import { useState, useEffect } from 'react';
import { Activity, EfetivoItem, EquipamentoItem } from '@/types/activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface ActivityFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
  initialData?: Activity;
}

const WEATHER_OPTIONS = ['BOM', 'CHUVA', 'NUBLADO', 'CHUVISCO'];
const DIAS_SEMANA = ['SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO', 'DOMINGO'];

const getDefaultFormData = (initialData?: Activity) => ({
  data: initialData?.data || new Date().toISOString().split('T')[0],
  dia: initialData?.dia || '',
  fiscal: initialData?.fiscal || '',
  contratada: initialData?.contratada || '',
  obra: initialData?.obra || '',
  frenteObra: initialData?.frenteObra || '',
  area: initialData?.area || '',
  codigo: initialData?.codigo || 'RD',
  cn: initialData?.cn || '',
  cliente: initialData?.cliente || '',
  temperatura: initialData?.temperatura || 25,
  condicaoManha: initialData?.condicaoManha || 'BOM',
  condicaoTarde: initialData?.condicaoTarde || 'BOM',
  condicaoNoite: initialData?.condicaoNoite || 'BOM',
  praticavel: initialData?.praticavel ?? true,
  volumeChuva: initialData?.volumeChuva || 0,
  efetivoDetalhado: initialData?.efetivoDetalhado || [],
  equipamentosDetalhado: initialData?.equipamentosDetalhado || [],
  condicoesClima: initialData?.condicoesClima || 'BOM',
  efetivoTotal: initialData?.efetivoTotal || 0,
  equipamentos: initialData?.equipamentos || 0,
  atividades: initialData?.atividades || '',
  observacoes: initialData?.observacoes || '',
  ocorrencias: initialData?.ocorrencias || '',
});

export function ActivityForm({ open, onClose, onSave, initialData }: ActivityFormProps) {
  const [formData, setFormData] = useState(getDefaultFormData(initialData));

  useEffect(() => {
    if (open) {
      setFormData(getDefaultFormData(initialData));
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calcular totais automaticamente
    const efetivoTotal = formData.efetivoDetalhado.reduce((sum, item) => sum + item.quantidade, 0);
    const equipamentosTotal = formData.equipamentosDetalhado.reduce((sum, item) => sum + item.quantidade, 0);
    
    onSave({
      ...formData,
      efetivoTotal: efetivoTotal || formData.efetivoTotal,
      equipamentos: equipamentosTotal || formData.equipamentos,
    });
    onClose();
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Efetivo handlers
  const addEfetivo = () => {
    setFormData(prev => ({
      ...prev,
      efetivoDetalhado: [...prev.efetivoDetalhado, { funcao: '', quantidade: 1 }]
    }));
  };

  const updateEfetivo = (index: number, field: keyof EfetivoItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      efetivoDetalhado: prev.efetivoDetalhado.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeEfetivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      efetivoDetalhado: prev.efetivoDetalhado.filter((_, i) => i !== index)
    }));
  };

  // Equipamentos handlers
  const addEquipamento = () => {
    setFormData(prev => ({
      ...prev,
      equipamentosDetalhado: [...prev.equipamentosDetalhado, { equipamento: '', quantidade: 1 }]
    }));
  };

  const updateEquipamento = (index: number, field: keyof EquipamentoItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      equipamentosDetalhado: prev.equipamentosDetalhado.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeEquipamento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipamentosDetalhado: prev.equipamentosDetalhado.filter((_, i) => i !== index)
    }));
  };

  const handleImageDataExtracted = (extracted: Record<string, unknown>) => {
    setFormData((prev) => ({
      ...prev,
      data: (extracted.data as string) || prev.data,
      dia: (extracted.diaSemana as string) || prev.dia,
      fiscal: (extracted.fiscal as string) || prev.fiscal,
      contratada: (extracted.contratada as string) || prev.contratada,
      obra: (extracted.obra as string) || prev.obra,
      frenteObra: (extracted.frenteTrabalho as string) || prev.frenteObra,
      area: (extracted.area as string) || prev.area,
      codigo: (extracted.codigo as string) || prev.codigo,
      cn: (extracted.cn as string) || prev.cn,
      cliente: (extracted.cliente as string) || prev.cliente,
      temperatura: (extracted.temperatura as number) || prev.temperatura,
      condicaoManha: (extracted.condicaoManha as string) || prev.condicaoManha,
      condicaoTarde: (extracted.condicaoTarde as string) || prev.condicaoTarde,
      condicaoNoite: (extracted.condicaoNoite as string) || prev.condicaoNoite,
      praticavel: extracted.praticavel !== undefined ? (extracted.praticavel as boolean) : prev.praticavel,
      volumeChuva: (extracted.volumeChuva as number) || prev.volumeChuva,
      efetivoDetalhado: (extracted.efetivoDetalhado as EfetivoItem[]) || prev.efetivoDetalhado,
      equipamentosDetalhado: (extracted.equipamentosDetalhado as EquipamentoItem[]) || prev.equipamentosDetalhado,
      condicoesClima: (extracted.condicaoClimatica as string) || prev.condicoesClima,
      efetivoTotal: (extracted.efetivoTotal as number) || prev.efetivoTotal,
      equipamentos: (extracted.equipamentos as number) || prev.equipamentos,
      atividades: (extracted.atividades as string) || prev.atividades,
      observacoes: (extracted.observacoes as string) || prev.observacoes,
      ocorrencias: (extracted.ocorrencias as string) || prev.ocorrencias,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {initialData ? 'Editar RDA' : 'Novo RDA - Relatório de Atividades'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Image/PDF Upload for OCR */}
          <div className="space-y-2">
            <Label>Importar de Imagem ou PDF (IA)</Label>
            <ImageUpload onDataExtracted={handleImageDataExtracted} />
          </div>

          {/* Cabeçalho */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">CABEÇALHO</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => updateField('data', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dia">Dia da Semana</Label>
                <Select value={formData.dia} onValueChange={(value) => updateField('dia', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((dia) => (
                      <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => updateField('codigo', e.target.value)}
                  placeholder="RD"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  placeholder="Ex: IMPLANTAÇÃO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cn">CN</Label>
                <Input
                  id="cn"
                  value={formData.cn}
                  onChange={(e) => updateField('cn', e.target.value)}
                  placeholder="Ex: 456"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="obra">Obra</Label>
                <Input
                  id="obra"
                  value={formData.obra}
                  onChange={(e) => updateField('obra', e.target.value)}
                  placeholder="Nome/tipo da obra"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frenteObra">Frente de Obra</Label>
                <Input
                  id="frenteObra"
                  value={formData.frenteObra}
                  onChange={(e) => updateField('frenteObra', e.target.value)}
                  placeholder="Localização/frente"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fiscal">Fiscal</Label>
                <Input
                  id="fiscal"
                  value={formData.fiscal}
                  onChange={(e) => updateField('fiscal', e.target.value)}
                  placeholder="Nome do fiscal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => updateField('cliente', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contratada">Contratada</Label>
              <Input
                id="contratada"
                value={formData.contratada}
                onChange={(e) => updateField('contratada', e.target.value)}
                placeholder="Nome da contratada"
                required
              />
            </div>
          </div>

          {/* Condições de Tempo */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">CONDIÇÕES DE TEMPO</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperatura">Temp. (ºC)</Label>
                <Input
                  id="temperatura"
                  type="number"
                  value={formData.temperatura}
                  onChange={(e) => updateField('temperatura', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Manhã</Label>
                <Select value={formData.condicaoManha} onValueChange={(value) => updateField('condicaoManha', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tarde</Label>
                <Select value={formData.condicaoTarde} onValueChange={(value) => updateField('condicaoTarde', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Noite</Label>
                <Select value={formData.condicaoNoite} onValueChange={(value) => updateField('condicaoNoite', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="praticavel"
                  checked={formData.praticavel}
                  onCheckedChange={(checked) => updateField('praticavel', checked)}
                />
                <Label htmlFor="praticavel">Praticável?</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="volumeChuva">Volume Chuva (mm)</Label>
                <Input
                  id="volumeChuva"
                  type="number"
                  min="0"
                  value={formData.volumeChuva}
                  onChange={(e) => updateField('volumeChuva', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Efetivo */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">EFETIVO</h3>
              <Button type="button" variant="outline" size="sm" onClick={addEfetivo}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            
            {formData.efetivoDetalhado.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum efetivo cadastrado</p>
            ) : (
              <div className="space-y-2">
                {formData.efetivoDetalhado.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Função (ex: Pedreiro)"
                      value={item.funcao}
                      onChange={(e) => updateEfetivo(index, 'funcao', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.quantidade}
                      onChange={(e) => updateEfetivo(index, 'quantidade', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEfetivo(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">
                  Total: {formData.efetivoDetalhado.reduce((sum, item) => sum + item.quantidade, 0)} pessoas
                </p>
              </div>
            )}
          </div>

          {/* Equipamentos */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">EQUIPAMENTOS</h3>
              <Button type="button" variant="outline" size="sm" onClick={addEquipamento}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            
            {formData.equipamentosDetalhado.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado</p>
            ) : (
              <div className="space-y-2">
                {formData.equipamentosDetalhado.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Equipamento (ex: Martelete)"
                      value={item.equipamento}
                      onChange={(e) => updateEquipamento(index, 'equipamento', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.quantidade}
                      onChange={(e) => updateEquipamento(index, 'quantidade', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEquipamento(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">
                  Total: {formData.equipamentosDetalhado.reduce((sum, item) => sum + item.quantidade, 0)} equipamentos
                </p>
              </div>
            )}
          </div>

          {/* Atividades */}
          <div className="space-y-2">
            <Label htmlFor="atividades">Descrição das Atividades da Contratada</Label>
            <Textarea
              id="atividades"
              value={formData.atividades}
              onChange={(e) => updateField('atividades', e.target.value)}
              placeholder="Descreva as atividades realizadas..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Observações e Ocorrências */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                placeholder="Observações..."
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ocorrencias">Ocorrências</Label>
              <Textarea
                id="ocorrencias"
                value={formData.ocorrencias}
                onChange={(e) => updateField('ocorrencias', e.target.value)}
                placeholder="Ocorrências..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="gradient-primary">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
