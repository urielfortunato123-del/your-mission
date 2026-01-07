import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Image as ImageIcon, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedData {
  data?: string;
  diaSemana?: string;
  fiscal?: string;
  contratada?: string;
  obra?: string;
  frenteTrabalho?: string;
  condicaoClimatica?: string;
  efetivoTotal?: number;
  equipamentos?: number;
  atividades?: string;
  observacoes?: string;
  situacao?: string;
  equipe?: string;
}

interface ImageUploadProps {
  onDataExtracted: (data: ExtractedData) => void;
}

export function ImageUpload({ onDataExtracted }: ImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    // Validate file type
    if (!isImage && !isPdf) {
      toast.error('Por favor, selecione uma imagem ou PDF válido');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setFileType(isImage ? 'image' : 'pdf');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreview(base64);
      await processFile(base64, isPdf);
    };
    reader.readAsDataURL(file);
  };

  const processFile = async (fileBase64: string, isPdf: boolean) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-activity', {
        body: { fileBase64, isPdf }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        toast.error('Erro ao processar arquivo. Tente novamente.');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.success && data.data) {
        const extracted = data.data as ExtractedData;
        
        // Map weather conditions
        if (extracted.condicaoClimatica) {
          const weatherMap: Record<string, string> = {
            'ensolarado': 'ensolarado',
            'sol': 'ensolarado',
            'nublado': 'nublado',
            'chuvoso': 'chuvoso',
            'chuva': 'chuvoso',
            'parcialmente_nublado': 'parcialmente_nublado',
            'parcialmente nublado': 'parcialmente_nublado',
          };
          extracted.condicaoClimatica = weatherMap[extracted.condicaoClimatica.toLowerCase()] || extracted.condicaoClimatica;
        }

        // Map day of week
        if (extracted.diaSemana) {
          const dayMap: Record<string, string> = {
            'segunda': 'segunda-feira',
            'segunda-feira': 'segunda-feira',
            'terça': 'terça-feira',
            'terça-feira': 'terça-feira',
            'quarta': 'quarta-feira',
            'quarta-feira': 'quarta-feira',
            'quinta': 'quinta-feira',
            'quinta-feira': 'quinta-feira',
            'sexta': 'sexta-feira',
            'sexta-feira': 'sexta-feira',
            'sábado': 'sábado',
            'sabado': 'sábado',
            'domingo': 'domingo',
          };
          extracted.diaSemana = dayMap[extracted.diaSemana.toLowerCase()] || extracted.diaSemana;
        }

        onDataExtracted(extracted);
        toast.success('Dados extraídos com sucesso!');
      }
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        ref={fileInputRef}
        className="hidden"
        disabled={isProcessing}
      />

      {!preview ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full h-24 border-dashed border-2 hover:border-primary hover:bg-primary/5"
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Clique para enviar imagem ou PDF do relatório
            </span>
          </div>
        </Button>
      ) : (
        <div className="relative rounded-lg border overflow-hidden">
          {fileType === 'image' ? (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">PDF carregado</span>
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Processando com IA...</span>
              </div>
            </div>
          )}
          {!isProcessing && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={clearPreview}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {preview && !isProcessing && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Enviar outro arquivo
        </Button>
      )}
    </div>
  );
}
