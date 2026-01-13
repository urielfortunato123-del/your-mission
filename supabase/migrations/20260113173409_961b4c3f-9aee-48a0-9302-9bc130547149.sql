-- Create storage bucket for BM price sheet files (up to 100MB each)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'price-sheets', 
  'price-sheets', 
  false, 
  104857600, -- 100MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/pdf']
);

-- Storage policies for price sheets
CREATE POLICY "Anyone can upload price sheets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'price-sheets');

CREATE POLICY "Anyone can view price sheets" ON storage.objects
  FOR SELECT USING (bucket_id = 'price-sheets');

CREATE POLICY "Anyone can delete price sheets" ON storage.objects
  FOR DELETE USING (bucket_id = 'price-sheets');

-- Table to track imported BM files (max 20 per contractor)
CREATE TABLE public.price_sheet_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  contratada TEXT NOT NULL,
  contrato TEXT,
  items_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_sheet_files ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public app without auth)
CREATE POLICY "Allow all operations on price_sheet_files" ON public.price_sheet_files
  FOR ALL USING (true) WITH CHECK (true);

-- Table for parsed price items from BM sheets
CREATE TABLE public.price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES public.price_sheet_files(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UN',
  preco_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  categoria TEXT,
  fonte TEXT,
  contratada TEXT,
  contrato TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint per sheet to avoid duplicates
  UNIQUE(sheet_id, codigo)
);

-- Enable RLS
ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all operations on price_items" ON public.price_items
  FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_price_items_contratada ON public.price_items(contratada);
CREATE INDEX idx_price_items_codigo ON public.price_items(codigo);
CREATE INDEX idx_price_items_sheet ON public.price_items(sheet_id);

-- Service entries table (already using localStorage, now with DB backup)
CREATE TABLE public.service_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL,
  price_item_id UUID REFERENCES public.price_items(id),
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(15,4) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'UN',
  preco_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,4) NOT NULL DEFAULT 0,
  data DATE NOT NULL,
  contratada TEXT,
  fiscal TEXT,
  obra TEXT,
  localizacao TEXT,
  km_inicial TEXT,
  km_final TEXT,
  estaca_inicial TEXT,
  estaca_final TEXT,
  faixa TEXT,
  lado TEXT,
  trecho TEXT,
  segmento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all operations on service_entries" ON public.service_entries
  FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_service_entries_contratada ON public.service_entries(contratada);
CREATE INDEX idx_service_entries_activity ON public.service_entries(activity_id);
CREATE INDEX idx_service_entries_data ON public.service_entries(data);