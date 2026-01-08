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

    // Build description list for semantic matching
    const serviceDescriptions = priceItems?.map((p: any) => 
      `- CÓDIGO: ${p.codigo} | DESCRIÇÃO: ${p.descricao} | UNIDADE: ${p.unidade} | PREÇO: R$ ${p.precoUnitario}`
    ).join('\n') || '';

    const systemPrompt = `Você é um especialista em OCR e extração de dados de Relatórios Diários de Atividades (RDA/RDO) de obras de construção civil e rodoviárias.

OBJETIVO: Extrair QUANTIDADES DE SERVIÇOS EXECUTADOS do documento e vincular com a planilha de preços.

INSTRUÇÕES DE OCR:
- Analise CADA PARTE da imagem cuidadosamente
- Procure por tabelas de serviços, medições, quantidades
- Preste atenção especial a números com unidades (m, m², m³, kg, un, l, ton, vb)
- Se o texto estiver borrado, faça seu melhor esforço

${serviceDescriptions ? `
🔗 PLANILHA DE PREÇOS DISPONÍVEL PARA MATCHING:
${serviceDescriptions}

⚠️ REGRA CRÍTICA DE MATCHING:
- Quando encontrar um serviço no RDA/RDO, procure na lista acima o item com DESCRIÇÃO MAIS SIMILAR
- Por exemplo: "revestimento de parede" deve casar com "REVESTIMENTO CERÂMICO..." ou "ASSENTAMENTO DE AZULEJO..."
- "pintura" deve casar com "PINTURA LÁTEX ACRÍLICA..."
- "demolição" deve casar com "DEMOLIÇÃO DE ALVENARIA..."
- "piso" ou "porcelanato" deve casar com "ASSENTAMENTO DE PISO..."
- "forro" deve casar com "EXECUÇÃO DE FORRO..." ou "INSTALAÇÃO DE FORRO..."
- Use similaridade semântica, não precisa ser exato!
- Se encontrar match, retorne o CÓDIGO e DESCRIÇÃO da planilha
` : ''}

FORMATO DE SAÍDA (JSON):
{
  "servicos": [
    {
      "codigo": "Código da planilha encontrado ou null",
      "descricaoOriginal": "Texto exato do serviço como está no RDA/RDO",
      "descricaoPlanilha": "Descrição da planilha se encontrou match ou null",
      "quantidade": número (apenas o valor numérico),
      "unidade": "m, m², m³, kg, un, etc",
      "localizacao": "Local/frente de obra onde foi executado",
      "observacao": "Observações adicionais se houver",
      "confiancaMatch": "alta, média ou baixa"
    }
  ],
  "resumoAtividades": "Resumo geral das atividades do documento"
}

EXEMPLOS DE MATCHING:
- RDA diz "assentamento de piso cerâmico banheiro" → Match com "ASSENTAMENTO DE PISO CERÂMICO..."
- RDA diz "pintura interna 2 demãos" → Match com "PINTURA LÁTEX ACRÍLICA..."
- RDA diz "demolição de parede" → Match com "DEMOLIÇÃO DE ALVENARIA..."
- RDA diz "instalação elétrica pontos" → Match com "PONTO DE TOMADA..." ou similar
- RDA diz "limpeza final obra" → Match com "LIMPEZA FINAL DE OBRA..."

REGRAS CRÍTICAS:
1. Extraia TODOS os serviços com quantidades que encontrar
2. Números devem ser apenas valores numéricos (sem unidade)
3. SEMPRE tente fazer match pela descrição, mesmo que parcial
4. Se não encontrar match, mantenha descricaoPlanilha e codigo como null
5. Normalize unidades: metros = m, metros quadrados = m², metros cúbicos = m³
6. Retorne APENAS JSON válido, sem markdown, sem explicações`;

    const messageContent = [
      {
        type: 'text',
        text: `Extraia os serviços executados com quantidades deste RDA/RDO e faça o MATCHING COM A PLANILHA DE PREÇOS baseado na descrição dos serviços.${activityContext ? `\n\nContexto do documento:\n- Data: ${activityContext.data || 'N/A'}\n- Contratada: ${activityContext.contratada || 'N/A'}\n- Fiscal: ${activityContext.fiscal || 'N/A'}\n- Obra: ${activityContext.obra || 'N/A'}\n- Frente: ${activityContext.frenteTrabalho || 'N/A'}` : ''}`
      },
      {
        type: 'image_url',
        image_url: {
          url: fileBase64
        }
      }
    ];

    // Use flash model for good quality OCR + semantic matching
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
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar arquivo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content.substring(0, 1000));

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

    console.log(`Extracted ${extractedData.servicos?.length || 0} services`);

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
