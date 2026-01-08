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
    const { fileBase64, priceItems, activityContext } = await req.json();
    
    if (!fileBase64) {
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

    console.log('Processing file for service extraction');
    console.log('Price items available:', priceItems?.length || 0);

    // Build the code list for matching
    const codeList = priceItems?.map((p: any) => `${p.codigo}: ${p.descricao} (${p.unidade})`).join('\n') || '';

    const systemPrompt = `Você é um especialista em OCR e extração de dados de Relatórios Diários de Atividades (RDA/RDO) de obras de construção civil.

OBJETIVO: Extrair QUANTIDADES DE SERVIÇOS EXECUTADOS do documento.

INSTRUÇÕES DE OCR:
- Analise CADA PARTE da imagem cuidadosamente
- Procure por tabelas de serviços, medições, quantidades
- Preste atenção especial a números com unidades (m, m², m³, kg, un, l, ton)
- Identifique códigos de serviço (ex: BSO-01, PAV-02, TER-001)
- Se o texto estiver borrado, faça seu melhor esforço

${codeList ? `CÓDIGOS DE SERVIÇO DISPONÍVEIS NA PLANILHA DE PREÇOS:
${codeList}

IMPORTANTE: Tente vincular cada serviço encontrado a um código da lista acima.` : ''}

Extraia os serviços no formato JSON:

{
  "servicos": [
    {
      "codigo": "Código do serviço (ex: BSO-01) ou null se não identificado",
      "descricao": "Descrição do serviço executado",
      "quantidade": número (apenas o valor numérico),
      "unidade": "m, m², m³, kg, un, etc",
      "localizacao": "Local/frente de obra onde foi executado",
      "observacao": "Observações adicionais se houver"
    }
  ],
  "resumoAtividades": "Resumo das atividades encontradas no documento"
}

REGRAS CRÍTICAS:
- Extraia TODOS os serviços com quantidades que encontrar
- Números devem ser apenas valores numéricos (sem unidade)
- Se não conseguir identificar o código, use null mas mantenha a descrição
- Tente normalizar as unidades: metros = m, metros quadrados = m², metros cúbicos = m³
- Retorne APENAS JSON válido, sem markdown, sem explicações
- Se não houver serviços com quantidades, retorne { "servicos": [], "resumoAtividades": "..." }`;

    const messageContent = [
      {
        type: 'text',
        text: `Extraia os serviços executados com quantidades deste RDA/RDO.${activityContext ? `\n\nContexto do documento:\n- Data: ${activityContext.data || 'N/A'}\n- Contratada: ${activityContext.contratada || 'N/A'}\n- Fiscal: ${activityContext.fiscal || 'N/A'}\n- Obra: ${activityContext.obra || 'N/A'}\n- Frente: ${activityContext.frenteTrabalho || 'N/A'}` : ''}`
      },
      {
        type: 'image_url',
        image_url: {
          url: fileBase64
        }
      }
    ];

    // Use lighter model for faster processing
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
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
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar arquivo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    // Parse JSON from response
    let extractedData = { servicos: [], resumoAtividades: '' };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-services function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
