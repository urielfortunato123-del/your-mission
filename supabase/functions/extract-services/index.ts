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
    
    // Support both image-based and text-based extraction
    const hasImage = !!fileBase64;
    const hasText = !!activityContext?.atividades;
    
    if (!hasImage && !hasText) {
      return new Response(
        JSON.stringify({ error: 'Forneça uma imagem ou texto de atividades' }),
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
    console.log('Contratada from context:', activityContext?.contratada || 'N/A');

    // Build description list for semantic matching - include price for auto-fill
    const serviceDescriptions = priceItems?.map((p: any) => 
      `- CÓDIGO: ${p.codigo} | DESCRIÇÃO: ${p.descricao} | UNIDADE: ${p.unidade} | PREÇO: R$ ${Number(p.precoUnitario || 0).toFixed(2)}`
    ).join('\n') || '';

    const contratadaInfo = activityContext?.contratada ? `\nCONTRATADA DO RDA: ${activityContext.contratada}` : '';

    const systemPrompt = `Você é um especialista em OCR e extração de dados de Relatórios Diários de Atividades (RDA/RDO) de obras de construção civil e rodoviárias.

OBJETIVO: Extrair QUANTIDADES DE SERVIÇOS EXECUTADOS do documento e vincular com a planilha de preços/BM para gerar a MEMÓRIA DE CÁLCULO.

INSTRUÇÕES DE OCR:
- Analise CADA PARTE da imagem/texto cuidadosamente
- Procure por tabelas de serviços, medições, quantidades
- Preste atenção especial a números com unidades (m, m², m³, kg, un, l, ton, vb)
- Se o texto estiver borrado, faça seu melhor esforço
${contratadaInfo}

${serviceDescriptions ? `
🔗 PLANILHA DE PREÇOS/BM DISPONÍVEL (já importada do contrato):
${serviceDescriptions}

⚠️ REGRA CRÍTICA DE MATCHING - VINCULAR COM A BM:
- Quando encontrar um serviço no RDA/RDO, procure na lista acima o item com DESCRIÇÃO MAIS SIMILAR
- PRIORIZE o CÓDIGO da planilha para fazer o vínculo com a BM
- Por exemplo: "revestimento de parede" deve casar com código que tenha descrição similar
- "pintura" deve casar com "PINTURA LÁTEX ACRÍLICA..."
- "demolição" deve casar com "DEMOLIÇÃO DE ALVENARIA..."
- Use similaridade semântica, não precisa ser exato!
- Se encontrar match, retorne o CÓDIGO, DESCRIÇÃO e PREÇO UNITÁRIO da planilha
` : '⚠️ NENHUMA PLANILHA DE PREÇOS CARREGADA - Extraia os dados mas não teremos preços'}

FORMATO DE SAÍDA (JSON):
{
  "servicos": [
    {
      "codigo": "Código EXATO da planilha BM encontrado (ex: T4011, O2609) ou null se não encontrou",
      "descricaoOriginal": "Texto exato do serviço como está no RDA/RDO",
      "descricaoPlanilha": "Descrição da planilha se encontrou match ou null",
      "quantidade": número (apenas o valor numérico),
      "unidade": "m, m², m³, kg, un, etc",
      "precoUnitario": número do preço unitário da planilha ou 0 se não encontrou,
      "localizacao": "Local/frente de obra onde foi executado (km, estaca, etc)",
      "observacao": "Observações adicionais se houver",
      "confiancaMatch": "alta, média ou baixa"
    }
  ],
  "resumoAtividades": "Resumo geral das atividades do documento"
}

EXEMPLOS DE MATCHING COM BM:
- RDA: "Barreira de concreto 68m" + BM tem "T4011 | Barreira Rígida de concreto..." → codigo: "T4011", quantidade: 68
- RDA: "Demolição 150 m³" + BM tem "O2609 | Demolição sucateamento..." → codigo: "O2609", quantidade: 150
- RDA: "Fresagem 500 m²" + BM tem "T1014 | Fresagem Funcional" → codigo: "T1014", quantidade: 500

REGRAS CRÍTICAS:
1. Extraia TODOS os serviços com quantidades que encontrar
2. Números devem ser apenas valores numéricos (sem unidade)
3. SEMPRE tente fazer match pelo código/descrição da planilha
4. Se não encontrar match, mantenha descricaoPlanilha e codigo como null
5. Normalize unidades: metros = m, metros quadrados = m², metros cúbicos = m³
6. INCLUA o precoUnitario da planilha quando encontrar match
7. Retorne APENAS JSON válido, sem markdown, sem explicações`;

    // Build message content based on input type
    let messageContent: any[];
    
    if (hasImage) {
      // Image-based extraction
      messageContent = [
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
    } else {
      // Text-based extraction
      messageContent = [
        {
          type: 'text',
          text: `Analise o texto abaixo de um RDA/RDO e extraia os serviços com quantidades. Faça o MATCHING COM A PLANILHA DE PREÇOS baseado na descrição.

TEXTO DAS ATIVIDADES:
${activityContext.atividades}

${activityContext.observacoes ? `OBSERVAÇÕES:\n${activityContext.observacoes}` : ''}

CONTEXTO:
- Obra: ${activityContext.obra || 'N/A'}
- Contratada: ${activityContext.contratada || 'N/A'}
- Frente: ${activityContext.frenteObra || activityContext.frenteTrabalho || 'N/A'}

IMPORTANTE: Extraia TODOS os serviços mencionados, mesmo que não tenham quantidades explícitas. Se não houver quantidade, use 1 como valor padrão.`
        }
      ];
    }

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
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
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
