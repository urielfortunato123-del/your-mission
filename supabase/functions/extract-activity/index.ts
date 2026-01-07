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

    const systemPrompt = `Você é um assistente especializado em extrair dados de Relatórios Diários de Atividades (RDA) de obras de construção civil.
    
Analise o documento/imagem e extraia os seguintes campos no formato JSON:

{
  "data": "YYYY-MM-DD",
  "diaSemana": "SEGUNDA-FEIRA|TERÇA-FEIRA|...",
  "fiscal": "Nome do fiscal/emitente",
  "contratada": "Nome da contratada",
  "obra": "Nome/descrição da obra",
  "frenteTrabalho": "Frente de obra/localização",
  "area": "Área (ex: IMPLANTAÇÃO)",
  "codigo": "Código do relatório (ex: RD)",
  "cn": "Número CN",
  "cliente": "Nome do cliente",
  "temperatura": número em graus celsius,
  "condicaoManha": "BOM|CHUVA|NUBLADO|CHUVISCO",
  "condicaoTarde": "BOM|CHUVA|NUBLADO|CHUVISCO",
  "condicaoNoite": "BOM|CHUVA|NUBLADO|CHUVISCO",
  "condicaoClimatica": "condição geral resumida",
  "praticavel": true ou false,
  "volumeChuva": número em mm,
  "efetivoDetalhado": [
    {"funcao": "Engenheiro civil", "quantidade": 1},
    {"funcao": "Pedreiro", "quantidade": 5},
    ...
  ],
  "equipamentosDetalhado": [
    {"equipamento": "Martelete", "quantidade": 4},
    {"equipamento": "Maquita", "quantidade": 4},
    ...
  ],
  "efetivoTotal": número total de pessoas,
  "equipamentos": número total de equipamentos,
  "atividades": "Descrição detalhada das atividades realizadas",
  "observacoes": "Observações gerais",
  "ocorrencias": "Ocorrências registradas"
}

REGRAS:
- Converta datas para formato YYYY-MM-DD
- Dias da semana em MAIÚSCULAS com hífen
- Condições climáticas em MAIÚSCULAS (BOM, CHUVA, NUBLADO, CHUVISCO)
- Some as quantidades do efetivo para efetivoTotal
- Some as quantidades de equipamentos para equipamentos
- Se não encontrar algum campo, use null
- Retorne APENAS o JSON, sem explicações`;

    const messageContent = [
      {
        type: 'text',
        text: 'Extraia os dados deste RDA (Relatório Diário de Atividades):'
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
