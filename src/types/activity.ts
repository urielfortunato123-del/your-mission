export interface EfetivoItem {
  funcao: string;
  quantidade: number;
}

export interface EquipamentoItem {
  equipamento: string;
  quantidade: number;
}

export interface Localizacao {
  kmInicial?: string;
  kmFinal?: string;
  estacaInicial?: string;
  estacaFinal?: string;
  faixa?: string;
  lado?: 'E' | 'D' | 'EIXO' | '';
  trecho?: string;
  segmento?: string;
}

export interface MedicaoManual {
  id: string;
  kmInicial: string;
  kmFinal: string;
  distancia: string;
  largura: string;
  altura: string;
  tonelada: string;
  // Campos calculados
  area: string;
  volume: string;
  // Campos adicionais baseados no Excel
  faixa: string;
  sentido: string;
  material: string;
  responsavel: string;
  descricao: string;
}

export interface Activity {
  id: string;
  data: string;
  dia: string;
  fiscal: string;
  contratada: string;
  obra: string;
  frenteObra: string;
  // Localização detalhada para memória de cálculo
  localizacao?: Localizacao;
  // Campos do modelo RDA
  area: string;
  codigo: string;
  cn: string;
  cliente: string;
  temperatura: number;
  condicaoManha: string;
  condicaoTarde: string;
  condicaoNoite: string;
  praticavel: boolean;
  volumeChuva: number;
  efetivoDetalhado: EfetivoItem[];
  equipamentosDetalhado: EquipamentoItem[];
  // Campos existentes
  condicoesClima: string;
  efetivoTotal: number;
  equipamentos: number;
  atividades: string;
  observacoes: string;
  ocorrencias: string;
  // Campos de medição
  quantidadeVerificada?: string;
  valorUnitario?: string;
  valorTotal?: string;
  medicoesManual?: MedicaoManual[];
  createdAt: string;
}

export type WeatherCondition = 'BOM' | 'CHUVA' | 'NUBLADO' | 'CHUVISCO';

export interface MonthSummary {
  totalAtividades: number;
  totalEfetivo: number;
  totalEquipamentos: number;
  contratodasAtivas: string[];
  obrasAtivas: string[];
  fiscais: string[];
}
