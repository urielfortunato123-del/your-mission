export interface Activity {
  id: string;
  data: string;
  dia: string;
  fiscal: string;
  contratada: string;
  obra: string;
  frenteObra: string;
  condicoesClima: string;
  efetivoTotal: number;
  equipamentos: number;
  atividades: string;
  observacoes: string;
  createdAt: string;
}

export type WeatherCondition = 'Bom' | 'Chuva' | 'Nublado' | 'Tarde Chuva' | 'Bom/Chuva Tarde';

export interface MonthSummary {
  totalAtividades: number;
  totalEfetivo: number;
  totalEquipamentos: number;
  contratodasAtivas: string[];
  obrasAtivas: string[];
  fiscais: string[];
}
