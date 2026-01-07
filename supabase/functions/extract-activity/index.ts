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
    const { fileBase64, isPdf, imageBase64 } = await req.json();
    
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

    console.log('Processing file for activity extraction, isPdf:', isPdf);

    // For PDF, we use the model that can handle documents directly
    // Gemini can process PDF as base64 data
    const messageContent = isPdf ? [
      {
        type: 'text',
        text: 'Extraia os dados de atividade deste PDF de relatório de obra. Analise o documento e extraia todas as informações disponíveis:'
      },
      {
        type: 'image_url',
        image_url: {
          url: base64Data
        }
      }
    ] : [
      {
        type: 'text',
        text: 'Extraia os dados de atividade desta imagem de relatório de obra:'
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
          {
            role: 'system',
            content: `Você é um assistente especializado em extrair dados de relatórios de atividades de obras de construção civil.
Analise o conteúdo e extraia os seguintes campos (se disponíveis):
- data: Data no formato YYYY-MM-DD
- diaSemana: Dia da semana (segunda-feira, terça-feira, etc)
- fiscal: Nome do fiscal/responsável
- contratada: Nome da empresa contratada/empreiteira
- obra: Nome/código da obra
- frenteTrabalho: Frente de trabalho (pista, faixa, estaca, etc)
- condicaoClimatica: Condição do tempo (ensolarado, nublado, chuvoso, parcialmente_nublado)
- efetivoTotal: Número total de efetivo/trabalhadores
- equipamentos: Número de equipamentos
- atividades: Descrição das atividades realizadas
- observacoes: Observações adicionais
- situacao: Status (Em Andamento, Finalizado, etc)
- equipe: Nome da equipe

Retorne APENAS um objeto JSON válido com os campos encontrados. Use null para campos não identificados.
Não inclua explicações, apenas o JSON.`
          },
          {
            role: 'user',
            content: messageContent
          }
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
      // Try to extract JSON from the response
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
