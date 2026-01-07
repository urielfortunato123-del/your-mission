import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, isPdf, imageBase64, mimeType } = await req.json();
    
    // Support both old (imageBase64) and new (fileBase64) parameter names
    const base64Data = fileBase64 || imageBase64;
    
    if (!base64Data) {
      return new Response(
        JSON.stringify({ error: 'Arquivo não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing file for RDA extraction, isPdf:', isPdf);

    const systemPrompt = `Você é um especialista em OCR e extração de dados de Relatórios Diários de Atividades (RDA) de obras de construção civil.

INSTRUÇÕES DE OCR:
- Analise CADA PARTE da imagem cuidadosamente
- Se o texto estiver borrado ou inclinado, faça seu melhor esforço para ler
- Procure por tabelas, formulários, campos preenchidos à mão ou digitados
- Preste atenção especial a números, datas e nomes
- Se houver múltiplas páginas/seções, extraia TODOS os dados

Extraia os seguintes campos no formato JSON:

{
  "data": "YYYY-MM-DD",
  "diaSemana": "SEGUNDA-FEIRA|TERÇA-FEIRA|QUARTA-FEIRA|QUINTA-FEIRA|SEXTA-FEIRA|SÁBADO|DOMINGO",
  "fiscal": "Nome do fiscal/emitente (quem assinou/elaborou)",
  "contratada": "Nome da empresa contratada",
  "obra": "Nome/descrição da obra ou contrato",
  "frenteTrabalho": "Frente de obra/localização específica",
  "area": "Área (ex: IMPLANTAÇÃO, PAVIMENTAÇÃO)",
  "codigo": "Código do relatório (ex: RD-001)",
  "cn": "Número CN se houver",
  "cliente": "Nome do cliente/contratante",
  "temperatura": número em graus celsius (só o número),
  "condicaoManha": "BOM|CHUVA|NUBLADO|CHUVISCO",
  "condicaoTarde": "BOM|CHUVA|NUBLADO|CHUVISCO",
  "condicaoNoite": "BOM|CHUVA|NUBLADO|CHUVISCO",
  "condicaoClimatica": "resumo geral do clima",
  "praticavel": true se o dia foi praticável/trabalhável, false se não,
  "volumeChuva": número em mm (só o número),
  "efetivoDetalhado": [
    {"funcao": "Nome da função/cargo", "quantidade": número},
    ...liste TODAS as funções encontradas...
  ],
  "equipamentosDetalhado": [
    {"equipamento": "Nome do equipamento", "quantidade": número},
    ...liste TODOS os equipamentos encontrados...
  ],
  "efetivoTotal": soma total de todas as pessoas,
  "equipamentos": soma total de todos os equipamentos,
  "atividades": "Descrição COMPLETA e DETALHADA de todas as atividades realizadas",
  "observacoes": "Todas as observações encontradas",
  "ocorrencias": "Todas as ocorrências/incidentes registrados"
}

REGRAS CRÍTICAS:
- Converta datas brasileiras (DD/MM/YYYY) para YYYY-MM-DD
- Dias da semana em MAIÚSCULAS com hífen (SEGUNDA-FEIRA, TERÇA-FEIRA, etc)
- Condições climáticas: normalize para BOM, CHUVA, NUBLADO ou CHUVISCO
- NÃO PULE nenhum item do efetivo ou equipamentos - liste TODOS
- Se um valor não existir, use null (não invente dados)
- Retorne APENAS o JSON válido, sem markdown, sem explicações
- Se houver texto manuscrito difícil de ler, faça seu melhor esforço`;

    const messageContent = [
      {
        type: 'text',
        text: 'Use OCR para ler este documento RDA (Relatório Diário de Atividades). Extraia TODOS os dados visíveis, incluindo tabelas de efetivo e equipamentos:'
      },
      {
        type: 'image_url',
        image_url: {
          url: base64Data
        }
      }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos na sua workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar arquivo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    // Parse JSON from response
    let extractedData = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      extractedData = { raw: content };
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-activity function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
