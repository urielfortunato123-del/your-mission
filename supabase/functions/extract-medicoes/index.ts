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
    const { textoAtividade } = await req.json();
    
    if (!textoAtividade || textoAtividade.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Texto da atividade não fornecido', medicoes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    console.log("Extraindo medições do texto:", textoAtividade.substring(0, 200));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em extrair informações de medições de relatórios de obras rodoviárias.
Analise o texto e extraia todas as medições encontradas.

Para cada medição, extraia:
- descricao: descrição da atividade (ex: "Fresagem, recomposição e pintura horizontal")
- kmInicial: km inicial (ex: "50,740")
- kmFinal: km final (ex: "51,680") 
- faixa: faixa(s) (ex: "I", "II", "I - II", "Acostamento", "I - II - Acostamento")
- sentido: sentido (ex: "Leste", "Oeste")
- material: material utilizado (ex: "C.A.U.Q. EGL FAIXA 16,0 - 19,0 MM")
- responsavel: responsável pela atividade
- tonelada: quantidade em toneladas (ex: "200ton", "240 ton")
- largura: largura em metros (se mencionada)
- altura: altura em metros (se mencionada)

Se algum campo não for encontrado, deixe como string vazia.
Retorne um array com todas as medições encontradas.`
          },
          {
            role: "user",
            content: textoAtividade
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extrair_medicoes",
              description: "Extrai medições do texto de atividade de obra",
              parameters: {
                type: "object",
                properties: {
                  medicoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        descricao: { type: "string", description: "Descrição da atividade" },
                        kmInicial: { type: "string", description: "Km inicial" },
                        kmFinal: { type: "string", description: "Km final" },
                        faixa: { type: "string", description: "Faixa (I, II, Acostamento, etc)" },
                        sentido: { type: "string", description: "Sentido (Leste, Oeste, etc)" },
                        material: { type: "string", description: "Material utilizado" },
                        responsavel: { type: "string", description: "Responsável" },
                        tonelada: { type: "string", description: "Quantidade em toneladas" },
                        largura: { type: "string", description: "Largura em metros" },
                        altura: { type: "string", description: "Altura em metros" }
                      },
                      required: ["descricao"]
                    }
                  }
                },
                required: ["medicoes"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extrair_medicoes" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API de IA:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido, tente novamente mais tarde.", medicoes: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para processamento de IA.", medicoes: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta da IA:", JSON.stringify(data));

    let medicoes: any[] = [];
    
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
        medicoes = args.medicoes || [];
        console.log("Medições extraídas:", medicoes.length);
      } catch (parseError) {
        console.error("Erro ao parsear resposta:", parseError);
      }
    }

    return new Response(
      JSON.stringify({ medicoes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro na função extract-medicoes:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage, medicoes: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
