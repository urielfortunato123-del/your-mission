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
    const { text } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Texto não fornecido' }),
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

    console.log('Processing text report extraction, length:', text.length);

    const systemPrompt = `Você é um especialista em extração de dados de relatórios diários de atividades (RDA) de obras de construção civil.

Analise o texto do relatório e extraia TODAS as atividades mencionadas em formato estruturado.

Para CADA atividade identificada, retorne um objeto com:

{
  "atividades": [
    {
      "data": "YYYY-MM-DD",
      "diaSemana": "SEGUNDA-FEIRA|TERÇA-FEIRA|QUARTA-FEIRA|QUINTA-FEIRA|SEXTA-FEIRA|SÁBADO|DOMINGO",
      "fiscal": "Nome do fiscal responsável",
      "contratada": "Nome da empresa/equipe",
      "obra": "Identificação da obra (ex: P-17, SP-250)",
      "frenteTrabalho": "Local específico (km, trecho)",
      "area": "Área de atuação",
      "atividades": "Descrição completa da atividade",
      "observacoes": "Observações adicionais se houver",
      "responsavel": "Nome do responsável se mencionado",
      "materiais": "Materiais utilizados se mencionados",
      "quantidades": "Quantidades/medidas se mencionadas"
    }
  ],
  "resumo": {
    "dataRelatorio": "Data do relatório se identificada",
    "totalAtividades": número de atividades extraídas,
    "fiscais": ["lista de fiscais mencionados"],
    "obras": ["lista de obras/projetos mencionados"],
    "equipes": ["lista de equipes/contratadas"]
  }
}

REGRAS:
- Converta datas brasileiras (DD/MM/YY ou DD/MM/YYYY) para YYYY-MM-DD
- Separe cada atividade distinta em um objeto separado
- Se um fiscal supervisiona múltiplas frentes, crie uma atividade para cada frente
- Mantenha todas as informações técnicas (km, materiais, quantidades)
- Se não houver informação para um campo, use null
- Retorne APENAS JSON válido, sem markdown`;

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
          { role: 'user', content: `Extraia todas as atividades deste relatório:\n\n${text}` }
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
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar texto' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    let extractedData = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      extractedData = { raw: content, error: 'Falha ao estruturar dados' };
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-text-report function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
