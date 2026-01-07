import { useState, useEffect } from 'react';
import { Activity } from '@/types/activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { X, Save } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface ActivityFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
  initialData?: Activity;
}

const WEATHER_OPTIONS = ['Bom', 'Chuva', 'Nublado', 'Tarde Chuva', 'Bom/Chuva Tarde'];
const DIAS_SEMANA = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];

export function ActivityForm({ open, onClose, onSave, initialData }: ActivityFormProps) {
  const [formData, setFormData] = useState({
    data: initialData?.data || new Date().toISOString().split('T')[0],
    dia: initialData?.dia || '',
    fiscal: initialData?.fiscal || '',
    contratada: initialData?.contratada || '',
    obra: initialData?.obra || '',
    frenteObra: initialData?.frenteObra || '',
    condicoesClima: initialData?.condicoesClima || 'Bom',
    efetivoTotal: initialData?.efetivoTotal || 0,
    equipamentos: initialData?.equipamentos || 0,
    atividades: initialData?.atividades || '',
    observacoes: initialData?.observacoes || '',
  });

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        data: initialData?.data || new Date().toISOString().split('T')[0],
        dia: initialData?.dia || '',
        fiscal: initialData?.fiscal || '',
        contratada: initialData?.contratada || '',
        obra: initialData?.obra || '',
        frenteObra: initialData?.frenteObra || '',
        condicoesClima: initialData?.condicoesClima || 'Bom',
        efetivoTotal: initialData?.efetivoTotal || 0,
        equipamentos: initialData?.equipamentos || 0,
        atividades: initialData?.atividades || '',
        observacoes: initialData?.observacoes || '',
      });
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageDataExtracted = (extracted: Record<string, unknown>) => {
    setFormData((prev) => ({
      ...prev,
      data: (extracted.data as string) || prev.data,
      dia: (extracted.diaSemana as string) || prev.dia,
      fiscal: (extracted.fiscal as string) || prev.fiscal,
      contratada: (extracted.contratada as string) || (extracted.equipe as string) || prev.contratada,
      obra: (extracted.obra as string) || prev.obra,
      frenteObra: (extracted.frenteTrabalho as string) || prev.frenteObra,
      condicoesClima: (extracted.condicaoClimatica as string) || prev.condicoesClima,
      efetivoTotal: (extracted.efetivoTotal as number) || prev.efetivoTotal,
      equipamentos: (extracted.equipamentos as number) || prev.equipamentos,
      atividades: (extracted.atividades as string) || (extracted.situacao as string) || prev.atividades,
      observacoes: (extracted.observacoes as string) || prev.observacoes,
    }));
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {initialData ? 'Editar Atividade' : 'Nova Atividade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Image Upload for OCR */}
          <div className="space-y-2">
            <Label>Importar de Imagem (IA)</Label>
            <ImageUpload onDataExtracted={handleImageDataExtracted} />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Select
                value={formData.dia}
                onValueChange={(value) => updateField('dia', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((dia) => (
                    <SelectItem key={dia} value={dia}>
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clima">Condições do Tempo</Label>
              <Select
                value={formData.condicoesClima}
                onValueChange={(value) => updateField('condicoesClima', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Clima" />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="efetivo">Efetivo Total</Label>
              <Input
                id="efetivo"
                type="number"
                min="0"
                value={formData.efetivoTotal}
                onChange={(e) => updateField('efetivoTotal', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipamentos">Equipamentos</Label>
              <Input
                id="equipamentos"
                type="number"
                min="0"
                value={formData.equipamentos}
                onChange={(e) => updateField('equipamentos', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="atividades">Atividades da Contratada</Label>
            <Textarea
              id="atividades"
              value={formData.atividades}
              onChange={(e) => updateField('atividades', e.target.value)}
              placeholder="Descreva as atividades realizadas..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => updateField('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
              className="min-h-[60px]"
            />
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
