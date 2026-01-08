// Planilha de preços base
export interface PriceItem {
  id: string;
  codigo: string; // Código do serviço (ex: BSO-01, PAV-02)
  descricao: string;
  unidade: string; // m, m², m³, kg, un, etc.
  precoUnitario: number;
  categoria?: string; // Categoria para agrupamento
  fonte?: string; // DER, DNIT, SICRO, SINAPI, etc.
  createdAt: string;
}

// Lançamento de serviço extraído do RDA
export interface ServiceEntry {
  id: string;
  activityId: string; // ID da atividade/RDA de origem
  priceItemId: string; // ID do item da planilha de preços
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  valorTotal: number;
  data: string;
  contratada: string;
  fiscal: string;
  obra: string;
  localizacao: string; // Frente de obra/local específico
  observacoes?: string;
  createdAt: string;
}

// Memória de cálculo por empresa/período
export interface MedicaoSummary {
  contratada: string;
  periodo: { inicio: string; fim: string };
  itens: ServiceEntry[];
  valorTotal: number;
  obra?: string;
  fiscal?: string;
}

// Templates disponíveis para exportação
export type ReportTemplate = 'der-sp' | 'dnit' | 'nota-servico' | 'boletim-medicao';

export interface ReportConfig {
  template: ReportTemplate;
  titulo?: string;
  contratante?: string;
  contrato?: string;
  medicaoNumero?: number;
  periodo: { inicio: string; fim: string };
  contratada?: string;
}
