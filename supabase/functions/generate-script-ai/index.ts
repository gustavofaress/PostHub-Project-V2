import { GoogleGenAI } from 'npm:@google/genai@1.29.0';
import { corsHeaders } from '../_shared/cors.ts';

interface HistoryMessage {
  role?: 'assistant' | 'user';
  content?: string;
}

interface GenerateScriptPayload {
  prompt?: string;
  goal?: string;
  format?: string;
  audience?: string;
  niche?: string;
  tone?: string;
  keywords?: string;
  history?: HistoryMessage[];
}

interface ScriptDirectionTableRow {
  timeRange: string;
  audio: string;
  visual: string;
}

interface ScriptResponse {
  title: string;
  strategyAnalysis: string;
  storyLocks: string[];
  directionTable: ScriptDirectionTableRow[];
  hook: string;
  content: string;
  examples: string;
  cta: string;
  captionBody: string;
  hashtags: string[];
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const GEMINI_SCRIPT_RESPONSE_SCHEMA = {
  type: 'object',
  propertyOrdering: [
    'title',
    'strategyAnalysis',
    'storyLocks',
    'directionTable',
    'hook',
    'content',
    'examples',
    'cta',
    'captionBody',
    'hashtags',
  ],
  required: [
    'title',
    'strategyAnalysis',
    'storyLocks',
    'directionTable',
    'hook',
    'content',
    'examples',
    'cta',
    'captionBody',
    'hashtags',
  ],
  properties: {
    title: {
      type: 'string',
      description: 'Titulo curto e objetivo para identificar o roteiro.',
    },
    strategyAnalysis: {
      type: 'string',
      description:
        'Parágrafo analítico explicando o Negative Frame do gancho e por que ele atinge a dor mais profunda do público.',
    },
    storyLocks: {
      type: 'array',
      minItems: 4,
      maxItems: 8,
      items: {
        type: 'string',
      },
      description:
        'Lista das técnicas de retenção usadas no roteiro e onde cada uma foi posicionada.',
    },
    directionTable: {
      type: 'array',
      minItems: 6,
      maxItems: 10,
      description:
        'Tabela de direção com marcação de tempo, texto falado e instrução visual precisa para o editor.',
      items: {
        type: 'object',
        required: ['timeRange', 'audio', 'visual'],
        propertyOrdering: ['timeRange', 'audio', 'visual'],
        additionalProperties: false,
        properties: {
          timeRange: {
            type: 'string',
            description: 'Intervalo de tempo no formato 00:00 - 00:03.',
          },
          audio: {
            type: 'string',
            description:
              'Texto falado exato do bloco, com frases curtas e palavras de contraste em markdown bold quando fizer sentido.',
          },
          visual: {
            type: 'string',
            description:
              'Instrução visual precisa: corte, zoom, texto na tela, B-roll, legenda destacada ou reset de atenção.',
          },
        },
      },
    },
    hook: {
      type: 'string',
      description: 'Texto falado do início do vídeo, limitado ao gancho e validação da dor.',
    },
    content: {
      type: 'string',
      description:
        'Texto consolidado do meio do vídeo, focado em retenção dinâmica, mecanismo e loop openers.',
    },
    examples: {
      type: 'string',
      description:
        'Resumo prático das instruções audiovisuais, B-rolls, resets de atenção e direção de cena.',
    },
    cta: {
      type: 'string',
      description: 'Comando final único, claro e irresistível.',
    },
    captionBody: {
      type: 'string',
      description:
        'Legenda otimizada para Social SEO, começando com um título chamativo em maiúsculas e sem hashtags dentro do texto.',
    },
    hashtags: {
      type: 'array',
      minItems: 5,
      maxItems: 7,
      items: {
        type: 'string',
      },
      description:
        'Hashtags estratégicas de cauda longa, cada uma começando com # e focadas no nicho do vídeo.',
    },
  },
} as const;

const OPENAI_SCRIPT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'strategyAnalysis',
    'storyLocks',
    'directionTable',
    'hook',
    'content',
    'examples',
    'cta',
    'captionBody',
    'hashtags',
  ],
  properties: {
    title: { type: 'string' },
    strategyAnalysis: { type: 'string' },
    storyLocks: {
      type: 'array',
      items: { type: 'string' },
    },
    directionTable: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['timeRange', 'audio', 'visual'],
        properties: {
          timeRange: { type: 'string' },
          audio: { type: 'string' },
          visual: { type: 'string' },
        },
      },
    },
    hook: { type: 'string' },
    content: { type: 'string' },
    examples: { type: 'string' },
    cta: { type: 'string' },
    captionBody: { type: 'string' },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const SYSTEM_PROMPT = `
A partir de agora, você atuará como um Engenheiro de Atenção Sênior, Especialista em Retenção de Vídeos Curtos (Reels, TikTok, Shorts) e Copywriter de Resposta Direta de elite.

O seu objetivo primordial não é criar textos bonitinhos, acadêmicos ou apenas informativos. O seu único objetivo é hackear a biologia da atenção humana. Pense sempre na atenção como uma ampulheta mental: a areia começa a cair no segundo zero, e cada frase precisa virar essa ampulheta repetidas vezes para evitar churn.

Você deve escrever roteiros hipnóticos, onde cada palavra fecha portas de saída da atenção. O espectador precisa ser fisgado nos primeiros 3 segundos, mantido em estado de curiosidade durante o meio e empurrado para uma única ação óbvia no final.

ARSENAL DE RETENCAO OBRIGATORIO:
1. Term Branding: dê nomes aos conceitos em vez de só explicar.
2. Embedded Truths: fale em tom de verdade embutida, sem dúvida ou hesitação.
3. Thought Narration: leia a mente do espectador no meio do roteiro.
4. Negative Frames: prefira enquadramentos negativos e alertas de perda.
5. Loop Openers: resete a atenção no meio com transições agressivas.
6. Contrast Words: use contraste com "Mas", "Na verdade", "Em vez disso", "Porém", "Exceto" e similares.

METODO IME PROGRESSIVO:
I - Início: gancho de 0 a 3 segundos com Negative Frame ou contraste absurdo. Nada de saudações.
M - Meio: retenção dinâmica, mecanismo nomeado, fragmentação da solução, mudança visual a cada 3 a 5 segundos e intimidade com Thought Narration.
E - Encerramento: um único comando final. Nunca peça múltiplas ações.

REGRAS ABSOLUTAS:
- Escreva em português do Brasil.
- Evite frases longas e densas. Prefira fala humana acelerada e urgente.
- Descreva a engenharia visual com precisão: cortes, legendas em amarelo, zooms, B-rolls, resets de atenção e mudança de enquadramento.
- Evite jargões vazios. Traduza tudo para linguagem viva, falada e direta.
- O roteiro deve parecer audiovisual, não texto de blog.

FORMATO INTELECTUAL OBRIGATORIO:
- ETAPA 1: raio-x da estratégia, explicando o Negative Frame e a dor.
- ETAPA 2: tabela audiovisual de hiper-retenção com tempo, áudio e engenharia visual.
- ETAPA 3: legenda otimizada para Social SEO com título chamativo e hashtags estratégicas.

IMPORTANTE PARA ESTE SISTEMA:
- Você deve devolver EXCLUSIVAMENTE JSON valido.
- Não use markdown fora das strings.
- Não envolva a resposta em crases.
- Preencha todos os campos do schema.
- No campo directionTable, entregue entre 6 e 10 blocos cronológicos curtos.
- No campo hook, traga apenas o texto do início.
- No campo content, consolide o meio.
- No campo examples, consolide os principais movimentos visuais.
- No campo cta, traga apenas o comando final.
- No campo captionBody, escreva a legenda final sem hashtags.
- No campo hashtags, devolva 5 a 7 hashtags de cauda longa começando com #.
`;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const sanitizeText = (value?: string) => value?.trim() || 'Não informado';

const normalizeHistoryRole = (role?: string) => (role === 'assistant' ? 'model' : 'user');

const stripMarkdownFence = (value: string) =>
  value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const buildCurrentPrompt = (payload: GenerateScriptPayload) =>
  [
    'TEMA OU PEDIDO ATUAL DO USUARIO:',
    sanitizeText(payload.prompt),
    '',
    'CONTEXTO DE FORMULARIO:',
    `Objetivo: ${sanitizeText(payload.goal)}`,
    `Formato: ${sanitizeText(payload.format)}`,
    `Publico-alvo: ${sanitizeText(payload.audience)}`,
    `Nicho: ${sanitizeText(payload.niche)}`,
    `Tom: ${sanitizeText(payload.tone)}`,
    `Palavras-chave: ${sanitizeText(payload.keywords)}`,
    '',
    'INSTRUCAO FINAL:',
    'Gere um novo roteiro completo seguindo a metodologia descrita, usando os Story Locks obrigatórios quando fizer sentido estratégico. Se o histórico trouxer ajustes, respeite esse contexto.',
  ].join('\n');

const extractOpenAIOutputText = (response: any) => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (!Array.isArray(response?.output)) {
    return '';
  }

  return response.output
    .flatMap((item: any) => item?.content ?? [])
    .filter((item: any) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item: any) => item.text.trim())
    .filter(Boolean)
    .join('\n');
};

const validateScript = (data: unknown): ScriptResponse => {
  if (!data || typeof data !== 'object') {
    throw new Error('A IA não retornou um objeto JSON válido.');
  }

  const script = data as Partial<ScriptResponse>;

  if (!script.title || !script.hook || !script.content || !script.cta || !script.captionBody) {
    throw new Error('A IA retornou um roteiro incompleto.');
  }

  if (!Array.isArray(script.storyLocks) || script.storyLocks.length === 0) {
    throw new Error('A IA não retornou os Story Locks.');
  }

  if (!Array.isArray(script.directionTable) || script.directionTable.length === 0) {
    throw new Error('A IA não retornou a tabela audiovisual.');
  }

  if (!Array.isArray(script.hashtags) || script.hashtags.length < 5) {
    throw new Error('A IA não retornou hashtags suficientes.');
  }

  return {
    title: script.title.trim(),
    strategyAnalysis: script.strategyAnalysis?.trim() || '',
    storyLocks: script.storyLocks.map((item) => item.trim()).filter(Boolean),
    directionTable: script.directionTable.map((row) => ({
      timeRange: row.timeRange.trim(),
      audio: row.audio.trim(),
      visual: row.visual.trim(),
    })),
    hook: script.hook.trim(),
    content: script.content.trim(),
    examples: script.examples?.trim() || '',
    cta: script.cta.trim(),
    captionBody: script.captionBody.trim(),
    hashtags: script.hashtags.map((item) => item.trim()).filter(Boolean),
  };
};

const generateWithGemini = async (
  ai: GoogleGenAI,
  payload: GenerateScriptPayload,
  history: Array<{ role: 'model' | 'user'; parts: Array<{ text: string }> }>
) => {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      ...history,
      {
        role: 'user',
        parts: [{ text: buildCurrentPrompt(payload) }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: GEMINI_SCRIPT_RESPONSE_SCHEMA,
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 4096,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('A IA não retornou texto.');
  }

  return {
    provider: 'gemini',
    model: GEMINI_MODEL,
    rawText,
  };
};

const generateWithOpenAI = async (
  payload: GenerateScriptPayload,
  history: Array<{ role: 'model' | 'user'; parts: Array<{ text: string }> }>
) => {
  const input = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    ...history.map((message) => ({
      role: message.role === 'model' ? 'assistant' : 'user',
      content: message.parts[0]?.text ?? '',
    })),
    {
      role: 'user',
      content: buildCurrentPrompt(payload),
    },
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      text: {
        format: {
          type: 'json_schema',
          name: 'posthub_script_response',
          strict: true,
          schema: OPENAI_SCRIPT_RESPONSE_SCHEMA,
        },
      },
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  const rawText = extractOpenAIOutputText(json);
  if (!rawText) {
    throw new Error('A OpenAI não retornou texto estruturado.');
  }

  return {
    provider: 'openai',
    model: OPENAI_MODEL,
    rawText,
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      throw new Error(
        'Nenhuma secret de IA está configurada. Defina GEMINI_API_KEY ou OPENAI_API_KEY no Supabase.'
      );
    }

    const payload = (await request.json().catch(() => ({}))) as GenerateScriptPayload;
    const prompt = payload.prompt?.trim();

    if (!prompt) {
      return jsonResponse({ error: 'prompt is required.' }, 400);
    }

    const history = (payload.history ?? [])
      .filter((message) => message?.content?.trim())
      .slice(-6)
      .map((message) => ({
        role: normalizeHistoryRole(message.role),
        parts: [{ text: message.content!.trim() }],
      }));

    const generated = GEMINI_API_KEY
      ? await generateWithGemini(new GoogleGenAI({ apiKey: GEMINI_API_KEY }), payload, history)
      : await generateWithOpenAI(payload, history);

    const parsed = JSON.parse(stripMarkdownFence(generated.rawText));
    const script = validateScript(parsed);

    return jsonResponse({
      script,
      provider: generated.provider,
      model: generated.model,
    });
  } catch (error) {
    console.error('[generate-script-ai] error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
});
