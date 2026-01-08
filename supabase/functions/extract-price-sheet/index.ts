import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, isPdf } = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing price sheet PDF...');

    // Use Lovable AI (gemini-2.5-flash) to extract price items from PDF
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'Lovable Price Sheet Extractor',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em extrair dados de planilhas de preços de serviços de obras/construção civil.

TAREFA: Extrair todos os itens de preço do documento.

FORMATO DE SAÍDA (JSON):
{
  "items": [
    {
      "codigo": "BSO-01",
      "descricao": "Revestimento em argamassa",
      "unidade": "m²",
      "precoUnitario": 45.50,
      "categoria": "Pavimentação",
      "fonte": "DER-SP"
    }
  ]
}

REGRAS:
1. Extraia TODOS os itens de preço visíveis no documento
2. Código: mantenha o formato original (ex: BSO-01, PAV-02, TER-001)
3. Descrição: texto completo do serviço
4. Unidade: m, m², m³, kg, un, t, h, etc.
5. Preço Unitário: valor numérico (sem R$, converter vírgula para ponto)
6. Categoria: agrupe por tipo de serviço se visível
7. Fonte: identifique se é DER, DNIT, SICRO, SINAPI ou outro

ATENÇÃO:
- Use OCR inteligente para textos borrados ou inclinados
- Procure por tabelas, linhas com códigos e valores
- Ignore cabeçalhos, logos e rodapés
- Se não encontrar preço, use 0
- Retorne APENAS o JSON, sem explicações`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: fileBase64
                }
              },
              {
                type: 'text',
                text: 'Extraia todos os itens de preço desta planilha/boletim de medição. Retorne apenas o JSON.'
              }
            ]
          }
        ],
        max_tokens: 8000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content.substring(0, 500));

    // Parse JSON from response
    let items = [];
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        items = parsed.items || [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Try to extract items array directly
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        items = JSON.parse(arrayMatch[0]);
      }
    }

    console.log(`Extracted ${items.length} price items`);

    return new Response(
      JSON.stringify({ success: true, items }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar planilha';
    console.error('Error processing price sheet:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});