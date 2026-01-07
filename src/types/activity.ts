export interface EfetivoItem {
  funcao: string;
  quantidade: number;
}

export interface EquipamentoItem {
  equipamento: string;
  quantidade: number;
}

export interface Activity {
  id: string;
  data: string;
  dia: string;
  fiscal: string;
  contratada: string;
  obra: string;
  frenteObra: string;
  // Novos campos do modelo RDA
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
