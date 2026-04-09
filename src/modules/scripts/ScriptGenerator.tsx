import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  Check,
  Copy,
  FileText,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';

import { Card, CardTitle } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';
import { supabase } from '../../shared/utils/supabase';
import { cn } from '../../shared/utils/cn';

interface ScriptDraft {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  hook: string | null;
  context: string | null;
  main_tips: string | null;
  examples: string | null;
  cta: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  source: string | null;
  is_favorite: boolean | null;
}

type ScriptObjective =
  | 'engajamento'
  | 'autoridade'
  | 'venda'
  | 'leads'
  | 'conexao';

type ScriptFormat =
  | 'video_falado'
  | 'storytelling'
  | 'lista'
  | 'tutorial'
  | 'reacao';

type ScriptTone =
  | 'direto'
  | 'provocativo'
  | 'didatico'
  | 'emocional'
  | 'inspirador'
  | 'opinativo';

type ScriptHookType =
  | 'pergunta'
  | 'polemico'
  | 'curiosidade'
  | 'erro_comum'
  | 'promessa'
  | 'contraste'
  | 'resultado';

type ScriptDbField = 'hook' | 'context' | 'main_tips' | 'examples' | 'cta';
type GenerationMode = 'ai' | 'template';

interface ScriptTemplateStep {
  etapa: string;
  descricao: string;
  campo_db: ScriptDbField;
  append: boolean;
}

interface ScriptTemplate {
  id: string;
  nome: string;
  quando_usar: string[];
  objetivos: ScriptObjective[];
  formatos: ScriptFormat[];
  tons: ScriptTone[];
  ganchos: ScriptHookType[];
  prioridade: number;
  estrutura: ScriptTemplateStep[];
}

interface GeneratedScript {
  title: string;
  hook: string;
  content: string;
  examples: string;
  cta: string;
  caption: string;
  reasoning: string;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  mode?: GenerationMode;
  creditsUsed?: number;
  script?: GeneratedScript;
}

const SCRIPT_GENERATION_CREDITS = 10;
const INITIAL_CREDITS = 1240;
const DRAFT_EXAMPLES_SEPARATOR = '\n\nLegenda / Social SEO:\n';
const STARTER_PROMPTS = [
  'Roteiro sobre constancia nas redes para social media',
  'Roteiro para vender consultoria sem parecer forçado',
  'Gancho forte para um Reels sobre posicionamento',
];

const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'contrarian_direto',
    nome: 'Contrarian Direto',
    quando_usar: ['autoridade', 'engajamento', 'posicionamento'],
    objetivos: ['engajamento', 'autoridade'],
    formatos: ['video_falado'],
    tons: ['provocativo', 'direto'],
    ganchos: ['polemico'],
    prioridade: 10,
    estrutura: [
      { etapa: 'hook', descricao: 'afirmação que contradiz uma crença popular', campo_db: 'hook', append: false },
      { etapa: 'beneficio', descricao: 'mostrar que entender isso muda o jogo', campo_db: 'context', append: true },
      { etapa: 'contexto', descricao: 'origem da opinião ou experiência', campo_db: 'context', append: true },
      { etapa: 'argumento', descricao: 'explicação lógica da afirmação', campo_db: 'main_tips', append: true },
      { etapa: 'reforco', descricao: 'exemplo ou consequência prática', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'incentivo a comentário ou debate', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'erro_invisivel',
    nome: 'Erro Invisível',
    quando_usar: ['autoridade', 'educacional'],
    objetivos: ['autoridade'],
    formatos: ['video_falado', 'tutorial'],
    tons: ['didatico', 'direto'],
    ganchos: ['erro_comum'],
    prioridade: 9,
    estrutura: [
      { etapa: 'hook', descricao: 'apontar erro que a maioria não percebe', campo_db: 'hook', append: false },
      { etapa: 'identificacao', descricao: 'fazer o público se reconhecer', campo_db: 'context', append: true },
      { etapa: 'explicacao', descricao: 'mostrar por que isso está errado', campo_db: 'main_tips', append: true },
      { etapa: 'correcao', descricao: 'apresentar a forma correta', campo_db: 'main_tips', append: true },
      { etapa: 'aplicacao', descricao: 'como executar na prática', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'incentivar salvar ou seguir', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'mini_story_virada',
    nome: 'Mini Story com Virada',
    quando_usar: ['conexao', 'autoridade'],
    objetivos: ['conexao', 'autoridade'],
    formatos: ['storytelling'],
    tons: ['emocional'],
    ganchos: ['curiosidade'],
    prioridade: 9,
    estrutura: [
      { etapa: 'hook', descricao: 'situação inicial intrigante', campo_db: 'hook', append: false },
      { etapa: 'contexto', descricao: 'explicação rápida do cenário', campo_db: 'context', append: true },
      { etapa: 'conflito', descricao: 'problema ou tensão central', campo_db: 'main_tips', append: true },
      { etapa: 'virada', descricao: 'mudança inesperada', campo_db: 'main_tips', append: true },
      { etapa: 'aprendizado', descricao: 'insight final da história', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'reflexão ou comentário', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'lista_alto_impacto',
    nome: 'Lista de Alto Impacto',
    quando_usar: ['retencao', 'compartilhamento'],
    objetivos: ['engajamento'],
    formatos: ['lista'],
    tons: ['direto'],
    ganchos: ['promessa'],
    prioridade: 8,
    estrutura: [
      { etapa: 'hook', descricao: 'quantidade + resultado', campo_db: 'hook', append: false },
      { etapa: 'beneficio', descricao: 'por que assistir até o final', campo_db: 'context', append: true },
      { etapa: 'lista', descricao: 'itens organizados por impacto', campo_db: 'main_tips', append: true },
      { etapa: 'rehook', descricao: 'transições que mantêm curiosidade', campo_db: 'main_tips', append: true },
      { etapa: 'fechamento', descricao: 'reforço de utilidade', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'salvar ou compartilhar', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'antes_depois',
    nome: 'Antes vs Depois Mental',
    quando_usar: ['venda', 'transformacao'],
    objetivos: ['venda'],
    formatos: ['video_falado'],
    tons: ['inspirador', 'direto'],
    ganchos: ['contraste', 'promessa'],
    prioridade: 8,
    estrutura: [
      { etapa: 'hook', descricao: 'contraste forte entre antes e depois', campo_db: 'hook', append: false },
      { etapa: 'identificacao', descricao: 'mostrar o público no estado atual', campo_db: 'context', append: true },
      { etapa: 'problema', descricao: 'por que estão travados', campo_db: 'main_tips', append: true },
      { etapa: 'mudanca', descricao: 'nova abordagem ou virada', campo_db: 'main_tips', append: true },
      { etapa: 'resultado', descricao: 'estado final desejado', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'ação direta', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'reacao_estrategica',
    nome: 'Reação Estratégica',
    quando_usar: ['tendencia', 'alcance'],
    objetivos: ['engajamento', 'autoridade'],
    formatos: ['reacao'],
    tons: ['opinativo', 'direto'],
    ganchos: ['curiosidade', 'polemico'],
    prioridade: 8,
    estrutura: [
      { etapa: 'hook', descricao: 'mostrar conteúdo, fato ou tendência', campo_db: 'hook', append: false },
      { etapa: 'reacao', descricao: 'opinião inicial imediata', campo_db: 'context', append: true },
      { etapa: 'contexto', descricao: 'explicação do que está acontecendo', campo_db: 'context', append: true },
      { etapa: 'analise', descricao: 'interpretação estratégica', campo_db: 'main_tips', append: true },
      { etapa: 'insight', descricao: 'o que poucos perceberam', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'seguir ou compartilhar', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'tutorial_descomplicado',
    nome: 'Tutorial Descomplicado',
    quando_usar: ['educacional', 'autoridade'],
    objetivos: ['autoridade', 'leads'],
    formatos: ['tutorial'],
    tons: ['didatico'],
    ganchos: ['promessa'],
    prioridade: 9,
    estrutura: [
      { etapa: 'hook', descricao: 'resultado específico ou promessa clara', campo_db: 'hook', append: false },
      { etapa: 'contexto', descricao: 'quando usar ou para quem serve', campo_db: 'context', append: true },
      { etapa: 'passos', descricao: 'sequência lógica do processo', campo_db: 'main_tips', append: true },
      { etapa: 'simplificacao', descricao: 'facilitar o entendimento', campo_db: 'examples', append: true },
      { etapa: 'erro', descricao: 'erro que deve ser evitado', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'incentivar salvar', campo_db: 'cta', append: false },
    ],
  },
  {
    id: 'autoridade_prova',
    nome: 'Autoridade com Prova',
    quando_usar: ['venda', 'conversao'],
    objetivos: ['venda', 'leads'],
    formatos: ['video_falado'],
    tons: ['direto', 'didatico'],
    ganchos: ['resultado', 'promessa'],
    prioridade: 9,
    estrutura: [
      { etapa: 'hook', descricao: 'resultado concreto ou conquista objetiva', campo_db: 'hook', append: false },
      { etapa: 'contexto', descricao: 'situação anterior', campo_db: 'context', append: true },
      { etapa: 'metodo', descricao: 'o que foi feito para chegar no resultado', campo_db: 'main_tips', append: true },
      { etapa: 'prova', descricao: 'evidência do resultado', campo_db: 'examples', append: true },
      { etapa: 'generalizacao', descricao: 'mostrar que isso pode servir para outras pessoas', campo_db: 'examples', append: true },
      { etapa: 'cta', descricao: 'ação direta', campo_db: 'cta', append: false },
    ],
  },
];

const INITIAL_CHAT_MESSAGE: ChatMessage = {
  id: 'assistant_welcome',
  role: 'assistant',
  content:
    'Me passe um tema e eu monto um roteiro no formato PostHub: gancho contra-intuitivo, meio com retenção, CTA objetivo e legenda com Social SEO.',
};

export const ScriptGenerator = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSavedView = searchParams.get('tab') === 'saved';

  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const { canAccess, isLoadingPermissions } = useWorkspacePermissions();
  const canManageScripts = canAccess('scripts');

  const [generationMode, setGenerationMode] = React.useState<GenerationMode>('ai');
  const [creditsBalance, setCreditsBalance] = React.useState(INITIAL_CREDITS);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [editingDraftId, setEditingDraftId] = React.useState<string | null>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
  const [drafts, setDrafts] = React.useState<ScriptDraft[]>([]);
  const [generatedScript, setGeneratedScript] = React.useState<GeneratedScript | null>(null);
  const [formData, setFormData] = React.useState({
    goal: 'Educational / Value',
    format: 'Short Video (Reels/TikTok)',
    audience: '',
    niche: '',
    tone: 'Professional',
    keywords: '',
  });

  function normalizeString(value?: string) {
    if (!value) return '';
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  }

  function normalizeObjective(goal: string): ScriptObjective {
    const value = normalizeString(goal);

    if (value.includes('sales') || value.includes('conversion')) return 'venda';
    if (value.includes('engagement') || value.includes('community')) return 'engajamento';
    if (value.includes('educational') || value.includes('value')) return 'autoridade';
    if (value.includes('entertainment')) return 'conexao';

    return 'autoridade';
  }

  function normalizeFormat(format: string): ScriptFormat {
    const value = normalizeString(format);

    if (value.includes('short_video') || value.includes('reels') || value.includes('tiktok')) return 'video_falado';
    if (value.includes('carousel')) return 'lista';
    if (value.includes('youtube')) return 'storytelling';
    if (value.includes('twitter') || value.includes('thread')) return 'lista';

    return 'video_falado';
  }

  function normalizeTone(tone: string): ScriptTone {
    const value = normalizeString(tone);

    if (value.includes('professional')) return 'didatico';
    if (value.includes('casual')) return 'direto';
    if (value.includes('energetic')) return 'inspirador';
    if (value.includes('humorous')) return 'opinativo';
    if (value.includes('empathetic')) return 'emocional';
    if (value.includes('authoritative')) return 'provocativo';

    return 'direto';
  }

  function getKeywordsList() {
    return formData.keywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function inferHookType(topic: string): ScriptHookType {
    const objective = normalizeObjective(formData.goal);
    const tone = normalizeTone(formData.tone);
    const keywordText = normalizeString(`${topic} ${formData.keywords}`);

    if (keywordText.includes('erro') || keywordText.includes('mistake')) return 'erro_comum';
    if (keywordText.includes('resultado') || keywordText.includes('result')) return 'resultado';
    if (objective === 'venda') return 'promessa';
    if (tone === 'provocativo') return 'polemico';
    if (tone === 'emocional') return 'curiosidade';
    if (normalizeFormat(formData.format) === 'lista') return 'promessa';

    return 'curiosidade';
  }

  function selectBestTemplate(topic: string) {
    const objective = normalizeObjective(formData.goal);
    const format = normalizeFormat(formData.format);
    const tone = normalizeTone(formData.tone);
    const hookType = inferHookType(topic);

    const scored = SCRIPT_TEMPLATES.map((template) => {
      let score = template.prioridade;

      if (template.objetivos.includes(objective)) score += 4;
      if (template.formatos.includes(format)) score += 5;
      if (template.tons.includes(tone)) score += 3;
      if (template.ganchos.includes(hookType)) score += 3;

      return { template, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.template ?? SCRIPT_TEMPLATES[0];
  }

  function pick<T>(items: T[], seed: string): T {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(index);
      hash |= 0;
    }
    const itemIndex = Math.abs(hash) % items.length;
    return items[itemIndex];
  }

  function appendField(base: string, next: string) {
    if (!base.trim()) return next.trim();
    if (!next.trim()) return base.trim();
    return `${base.trim()}\n\n${next.trim()}`;
  }

  function buildSentenceForStep(step: ScriptTemplateStep, templateId: string, topic: string) {
    const audience = formData.audience || 'o público certo';
    const niche = formData.niche || 'o seu nicho';
    const tone = formData.tone || 'seu tom';
    const keywords = getKeywordsList();
    const objective = normalizeObjective(formData.goal);
    const seed = `${templateId}_${step.etapa}_${topic}_${audience}_${niche}_${tone}_${formData.goal}_${formData.format}_${formData.keywords}`;

    const library: Record<string, string[]> = {
      hook: [
        `Todo mundo fala de ${topic} do jeito errado.`,
        `A maioria das pessoas que tenta falar de ${topic} está desperdiçando atenção.`,
        `Se você ainda aborda ${topic} do jeito comum, provavelmente está ficando invisível.`,
      ],
      beneficio: [
        'E quando você entende isso, a mensagem fica mais clara e muito mais forte.',
        'Essa pequena mudança de abordagem altera completamente a percepção do público.',
      ],
      contexto: [
        `No universo de ${niche}, isso aparece o tempo todo.`,
        `Se você cria para ${audience}, provavelmente já viu esse padrão acontecer.`,
      ],
      identificacao: [
        'Talvez você esteja fazendo isso agora sem perceber.',
        'É exatamente por isso que tanta gente se esforça e mesmo assim não prende atenção.',
      ],
      argumento: [
        'O jogo não é falar mais. É falar do jeito certo para a pessoa certa.',
        'Constância sem direção vira esforço. Estrutura vira retenção.',
      ],
      explicacao: [
        'Quando a promessa não é forte, o público abandona antes do valor aparecer.',
        'Quando a estrutura é fraca, a mensagem perde potência mesmo sendo boa.',
      ],
      correcao: [
        'O caminho melhor é organizar a mensagem antes de acelerar a produção.',
        'Você precisa de um gancho melhor, um meio mais ritmado e um CTA com direção clara.',
      ],
      aplicacao: [
        'Na prática, comece afinando a abertura, o contraste e a ação final que você quer provocar.',
        'Uma mudança simples na estrutura já melhora muito a forma como a audiência recebe a mensagem.',
      ],
      conflito: [
        'Mas aí aparece o problema: o que parecia simples não funciona do jeito que prometeram.',
        'É nesse ponto que a diferença entre improviso e estratégia fica evidente.',
      ],
      virada: [
        'A virada acontece quando a estrutura começa a trabalhar por você.',
        'Tudo muda quando você troca volume por intenção.',
      ],
      aprendizado: [
        'No fim, conteúdo melhor começa com uma estrutura melhor.',
        'Quando você entende essa lógica, cada novo roteiro fica mais fácil de construir.',
      ],
      lista: [
        `1. Abra ${topic} com um contraste forte.`,
        `2. Fale diretamente com ${audience}.`,
        `3. Use um exemplo claro de ${niche} para aterrar a mensagem.`,
      ],
      rehook: [
        'E é justamente no segundo ponto que a maioria erra.',
        'Agora vem a parte que realmente muda o jogo.',
      ],
      fechamento: [
        'É isso que faz o conteúdo parecer estratégico, e não aleatório.',
        'Quando você repete isso com consistência, a mensagem ganha força.',
      ],
      problema: [
        'O problema começa quando esforço vira sinônimo de estratégia.',
        'Muita gente produz sem direção e depois chama isso de constância.',
      ],
      mudanca: [
        'A mudança acontece quando cada parte do roteiro passa a ter uma função clara.',
        'Os resultados melhoram quando a estrutura deixa de ser improvisada.',
      ],
      resultado: [
        'Isso gera mais clareza, mais retenção e muito mais potencial de conversão.',
        'O resultado é um conteúdo mais intencional e muito mais memorável.',
      ],
      reacao: [
        'Minha primeira reação é: quase todo mundo vai ignorar a lição mais importante aqui.',
        'Na superfície isso parece simples, mas por trás existe uma decisão estratégica forte.',
      ],
      analise: [
        'Estrategicamente, isso mostra que estrutura importa mais do que execução superficial.',
        'O ponto central não é o formato em si, mas a lógica por trás da mensagem.',
      ],
      insight: [
        'O que pouca gente percebe é que formato chama atenção, mas estrutura segura a atenção.',
        'O ganho oculto está em tornar a mensagem mais fácil de entender e agir.',
      ],
      passos: [
        `Passo 1: defina a principal promessa sobre ${topic}.`,
        `Passo 2: organize a explicação para ${audience} entender rápido.`,
        'Passo 3: termine com um próximo passo muito claro.',
      ],
      simplificacao: [
        'A boa notícia é que isso não precisa ser complicado.',
        'Quanto mais limpa a lógica, mais fácil fica repetir com qualidade.',
      ],
      erro: [
        'O maior erro é querer dizer tudo de uma vez.',
        'Um começo fraco consegue estragar até uma ótima ideia.',
      ],
      metodo: [
        'O método foi simples: promessa forte, blocos claros e direção objetiva.',
        'O que funcionou foi parar de improvisar e começar a estruturar.',
      ],
      prova: [
        'E a prova aparece em mais retenção, mais clareza e mais resposta do público.',
        'Esse tipo de melhora não é aleatório, ele nasce de uma estrutura melhor.',
      ],
      generalizacao: [
        'E essa lógica não funciona só em um nicho. Ela se adapta a mercados diferentes.',
        'O princípio se sustenta porque toda audiência responde melhor à clareza.',
      ],
      cta: [
        objective === 'venda'
          ? 'Se você quer aplicar essa estrutura no seu conteúdo, comenta "roteiro" aqui embaixo.'
          : objective === 'engajamento'
          ? 'Qual dessas estratégias você usa hoje? Me conta nos comentários.'
          : 'Salve este vídeo para copiar essa estrutura no seu próximo roteiro.',
        'Se isso te ajudou, salva agora e manda para alguém que precisa ver isso.',
        'Segue para mais roteiros com estrutura de retenção real.',
      ],
    };

    const options = library[step.etapa] ?? [`Bloco estratégico sobre ${topic}.`];
    const text = pick(options, seed);

    if ((step.etapa === 'lista' || step.etapa === 'passos') && keywords.length > 0) {
      return `${text}\n${keywords
        .slice(0, 3)
        .map((keyword, index) => `${index + 1}. Amarre esse ponto com ${keyword}.`)
        .join('\n')}`;
    }

    return text;
  }

  function inferMyth(topic: string) {
    const normalized = normalizeString(topic);
    if (normalized.includes('constancia')) return 'achar que postar qualquer coisa todos os dias resolve';
    if (normalized.includes('venda')) return 'achar que vender bem é só falar mais da oferta';
    if (normalized.includes('engaj')) return 'achar que engajamento vem de truque e não de estrutura';
    return `achar que ${topic} funciona melhor no improviso`;
  }

  function inferAudienceSophistication() {
    const objective = normalizeObjective(formData.goal);
    if (objective === 'venda') return 'Já ouviu promessas parecidas e está cansado do básico.';
    if (objective === 'engajamento') return 'Consome muito conteúdo e só para quando sente contraste real.';
    return 'Já escutou o conselho óbvio, então precisa de um ângulo novo para prestar atenção.';
  }

  function inferEmotion() {
    const objective = normalizeObjective(formData.goal);
    if (objective === 'venda') return 'urgência com clareza';
    if (objective === 'engajamento') return 'curiosidade e confronto';
    if (objective === 'conexao') return 'alívio e identificação';
    return 'autoridade com sensação de descoberta';
  }

  function buildReasoning(topic: string) {
    const myth = inferMyth(topic);
    const sophistication = inferAudienceSophistication();
    const emotion = inferEmotion();

    return [
      'Passo 1: Mapeamento Estratégico',
      `Mito/inimigo comum: ${myth}.`,
      `Nível de sofisticação: ${sophistication}`,
      `Emoção central: ${emotion}.`,
      '',
      'Passo 2: Gancho de 3 segundos',
      'Abrimos com contraste ou paradoxo para comprar atenção sem apresentar o tema de forma óbvia.',
      '',
      'Passo 3: Meio com retenção',
      'O desenvolvimento é quebrado em frases curtas, com mecanismo claro e sugestões de respiro visual.',
      '',
      'Passo 4: Encerramento com CTA',
      'O final traz uma ação única, alinhada ao objetivo do roteiro.',
      '',
      'Passo 5: Social SEO',
      'A legenda reforça as palavras-chave que o público buscaria na plataforma.',
    ].join('\n');
  }

  function buildCaption(topic: string) {
    const keywordPool = [topic, formData.niche, formData.audience, ...getKeywordsList()].filter(Boolean);
    const uniqueKeywords = Array.from(new Set(keywordPool)).slice(0, 5);
    const hashtags = uniqueKeywords
      .map((item) => `#${normalizeString(item).replace(/_/g, '')}`)
      .filter(Boolean)
      .slice(0, 4)
      .join(' ');

    return [
      `${topic}: o ponto não é fazer mais, é estruturar melhor.`,
      `Se você trabalha com ${formData.niche || 'conteúdo estratégico'} e quer falar com ${formData.audience || 'a audiência certa'}, use esse roteiro para criar retenção sem enrolação.`,
      uniqueKeywords.length > 0
        ? `Palavras-chave: ${uniqueKeywords.join(', ')}.`
        : 'Palavras-chave: roteiro, retenção, conteúdo estratégico.',
      hashtags,
    ]
      .filter(Boolean)
      .join('\n');
  }

  function buildAiScript(topic: string): GeneratedScript {
    const myth = inferMyth(topic);
    const objective = normalizeObjective(formData.goal);
    const audience = formData.audience || 'quem precisa de mais clareza para produzir conteúdo';
    const niche = formData.niche || 'o seu mercado';
    const emotion = inferEmotion();

    const hook = `A pior coisa que você pode fazer com ${topic} hoje é seguir exatamente o que todo mundo manda.`;
    const content = [
      `Porque o problema não é falta de esforço. O problema é ${myth}.`,
      '',
      `Se você fala com ${audience}, precisa entender uma coisa: o público já ouviu o conselho óbvio.`,
      'Então você não vence pela repetição. Você vence pelo contraste.',
      '',
      'Faz assim:',
      '1. Comece quebrando uma crença comum.',
      '2. Explique o mecanismo por trás do erro em frases curtas.',
      '3. Mostre o jeito estratégico de executar no mundo real.',
      '',
      `No fim, a sensação que queremos gerar é ${emotion}, porque isso aumenta retenção e percepção de autoridade em ${niche}.`,
    ].join('\n');

    const examples = [
      'B-roll 1: close falando a frase do gancho com corte seco.',
      'B-roll 2: texto na tela destacando "erro comum" e "jeito estratégico".',
      'B-roll 3: corte lateral com lista 1, 2, 3 aparecendo em sincronia.',
      'B-roll 4: print, dashboard ou cena de bastidor para provar o argumento.',
      'B-roll 5: tela limpa no CTA com palavra-chave destacada.',
    ].join('\n');

    const cta =
      objective === 'venda'
        ? 'Comenta "roteiro" aqui embaixo que eu te mostro como aplicar isso no seu conteúdo.'
        : objective === 'engajamento'
        ? 'Qual dessas estratégias você está usando hoje? Me conta aqui embaixo.'
        : 'Salve esse vídeo para copiar essa estrutura no seu próximo roteiro.';

    return {
      title: topic,
      hook,
      content,
      examples,
      cta,
      caption: buildCaption(topic),
      reasoning: buildReasoning(topic),
    };
  }

  function buildTemplateScript(topic: string): GeneratedScript {
    const template = selectBestTemplate(topic);
    const fields: Record<ScriptDbField, string> = {
      hook: '',
      context: '',
      main_tips: '',
      examples: '',
      cta: '',
    };

    for (const step of template.estrutura) {
      const sentence = buildSentenceForStep(step, template.id, topic);
      if (step.append) {
        fields[step.campo_db] = appendField(fields[step.campo_db], sentence);
      } else {
        fields[step.campo_db] = sentence;
      }
    }

    return {
      title: topic,
      hook: fields.hook,
      content: [fields.context, fields.main_tips].filter(Boolean).join('\n\n'),
      examples: fields.examples || 'Use cortes rápidos, texto na tela e prova visual para reforçar a mensagem.',
      cta: fields.cta,
      caption: buildCaption(topic),
      reasoning: `Template escolhido: ${template.nome}. Estrutura aplicada com foco em ${template.quando_usar.join(', ')}.`,
    };
  }

  function formatAssistantScriptMessage(script: GeneratedScript, mode: GenerationMode) {
    const modeLabel = mode === 'ai' ? 'IA PostHub' : 'Template Inteligente';
    return [
      `${modeLabel} pronta para o tema "${script.title}".`,
      '',
      'Gancho:',
      script.hook,
      '',
      'Meio:',
      script.content,
      '',
      'Encerramento:',
      script.cta,
      '',
      'Legenda / Social SEO:',
      script.caption,
    ].join('\n');
  }

  function buildContextText(topic: string, mode: GenerationMode, prompt: string, script: GeneratedScript) {
    return [
      `Modo: ${mode === 'ai' ? 'IA PostHub' : 'Template Inteligente'}`,
      `Tema: ${topic}`,
      `Objetivo: ${formData.goal}`,
      `Formato: ${formData.format}`,
      `Público: ${formData.audience || '-'}`,
      `Nicho: ${formData.niche || '-'}`,
      `Tom: ${formData.tone || '-'}`,
      `Palavras-chave: ${formData.keywords || '-'}`,
      '',
      'Prompt do usuário:',
      prompt,
      '',
      'Estrutura aplicada:',
      script.reasoning,
    ].join('\n');
  }

  function serializeExamplesAndCaption(script: GeneratedScript) {
    return `${script.examples}${DRAFT_EXAMPLES_SEPARATOR}${script.caption}`;
  }

  function parseDraftExamples(raw: string | null) {
    if (!raw) {
      return { examples: '', caption: '' };
    }

    if (!raw.includes(DRAFT_EXAMPLES_SEPARATOR)) {
      return { examples: raw, caption: '' };
    }

    const [examples, caption] = raw.split(DRAFT_EXAMPLES_SEPARATOR);
    return {
      examples: examples.trim(),
      caption: caption.trim(),
    };
  }

  const buildFullContent = React.useCallback((script: GeneratedScript) => {
    return [
      'Gancho',
      script.hook,
      '',
      'Meio',
      script.content,
      '',
      'B-rolls e direção',
      script.examples,
      '',
      'CTA',
      script.cta,
      '',
      'Legenda / Social SEO',
      script.caption,
    ].join('\n');
  }, []);

  const resetComposer = React.useCallback(() => {
    setChatInput('');
    setGeneratedScript(null);
    setEditingDraftId(null);
    setIsSaved(false);
    setErrorMessage(null);
  }, []);

  const loadDrafts = React.useCallback(async () => {
    if (!supabase || !user?.id) {
      setDrafts([]);
      return;
    }

    setIsLoadingDrafts(true);
    setErrorMessage(null);

    try {
      let query = supabase
        .from('script_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (activeProfile?.id) {
        query = query.eq('profile_id', activeProfile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setDrafts((data ?? []) as ScriptDraft[]);
    } catch (error) {
      console.error('[Scripts] Error loading drafts:', error);
      setDrafts([]);
      setErrorMessage('Não foi possível carregar os roteiros deste perfil.');
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const handleGenerate = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? chatInput).trim();
    if (!prompt) {
      setErrorMessage('Escreva um tema ou pedido para gerar o roteiro.');
      return;
    }

    if (generationMode === 'ai' && creditsBalance < SCRIPT_GENERATION_CREDITS) {
      setErrorMessage('Você não tem créditos suficientes para gerar com IA.');
      return;
    }

    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: prompt,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    setChatInput('');

    window.setTimeout(() => {
      const nextScript =
        generationMode === 'ai' ? buildAiScript(prompt) : buildTemplateScript(prompt);
      const creditsUsed = generationMode === 'ai' ? SCRIPT_GENERATION_CREDITS : 0;

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        mode: generationMode,
        creditsUsed,
        script: nextScript,
        content: formatAssistantScriptMessage(nextScript, generationMode),
      };

      setGeneratedScript(nextScript);
      setChatMessages((prev) => [...prev, assistantMessage]);
      setIsGenerating(false);
      setEditingDraftId(null);
      setIsSaved(false);
      if (creditsUsed > 0) {
        setCreditsBalance((prev) => prev - creditsUsed);
      }
    }, 900);
  };

  const handleCopy = () => {
    if (!generatedScript) return;

    navigator.clipboard.writeText(buildFullContent(generatedScript));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = async () => {
    if (!generatedScript) return;

    if (!canManageScripts) {
      setErrorMessage('Seu acesso neste workspace não permite criar ou editar roteiros.');
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase não está configurado.');
      return;
    }

    if (!user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    if (!activeProfile?.id) {
      setErrorMessage('Nenhum perfil ativo selecionado.');
      return;
    }

    const latestPrompt =
      [...chatMessages].reverse().find((message) => message.role === 'user')?.content ??
      generatedScript.title;

    const payload = {
      user_id: user.id,
      profile_id: activeProfile.id,
      title: generatedScript.title.trim() || 'Roteiro sem título',
      hook: generatedScript.hook,
      context: buildContextText(generatedScript.title, generationMode, latestPrompt, generatedScript),
      main_tips: generatedScript.content,
      examples: serializeExamplesAndCaption(generatedScript),
      cta: generatedScript.cta,
      content: buildFullContent(generatedScript),
      updated_at: new Date().toISOString(),
      source: generationMode === 'ai' ? 'ai_chat_generator' : 'template_chat_generator',
      is_favorite: false,
    };

    try {
      if (editingDraftId) {
        const { data, error } = await supabase
          .from('script_drafts')
          .update(payload)
          .eq('id', editingDraftId)
          .eq('profile_id', activeProfile.id)
          .select('*')
          .single();

        if (error) throw error;

        setDrafts((prev) =>
          prev.map((draft) => (draft.id === editingDraftId ? (data as ScriptDraft) : draft))
        );
      } else {
        const { data, error } = await supabase
          .from('script_drafts')
          .insert([
            {
              ...payload,
              created_at: new Date().toISOString(),
            },
          ])
          .select('*')
          .single();

        if (error) throw error;

        const createdDraft = data as ScriptDraft;
        setDrafts((prev) => [createdDraft, ...prev]);
        setEditingDraftId(createdDraft.id);
      }

      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 2000);
    } catch (error: any) {
      console.error('[Scripts] Error saving draft:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar o roteiro.');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!canManageScripts) {
      setErrorMessage('Seu acesso neste workspace não permite excluir roteiros.');
      return;
    }

    if (!supabase || !user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    try {
      const { error } = await supabase
        .from('script_drafts')
        .delete()
        .eq('id', draftId)
        .eq('profile_id', activeProfile?.id);

      if (error) throw error;

      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));

      if (editingDraftId === draftId) {
        resetComposer();
      }
    } catch (error: any) {
      console.error('[Scripts] Error deleting draft:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir o roteiro.');
    }
  };

  const loadDraft = (draft: ScriptDraft) => {
    const parsed = parseDraftExamples(draft.examples);
    const nextScript: GeneratedScript = {
      title: draft.title || 'Roteiro sem título',
      hook: draft.hook || '',
      content: draft.main_tips || '',
      examples: parsed.examples,
      cta: draft.cta || '',
      caption: parsed.caption,
      reasoning: draft.context || 'Rascunho carregado do histórico.',
    };

    setEditingDraftId(draft.id);
    setGeneratedScript(nextScript);
    setChatInput(draft.title || '');
    setChatMessages((prev) => [
      ...prev,
      {
        id: `assistant_loaded_${draft.id}`,
        role: 'assistant',
        mode: 'ai',
        script: nextScript,
        content: `Rascunho "${draft.title || 'sem título'}" carregado para edição.`,
      },
    ]);
    setErrorMessage(null);
    setSearchParams({ tab: 'ai' });
  };

  const creditsAfterGeneration =
    generationMode === 'ai' ? creditsBalance - SCRIPT_GENERATION_CREDITS : creditsBalance;

  if (isSavedView) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand" />
            Roteiros Salvos
          </h1>
          <p className="text-text-secondary">
            Abra um rascunho para continuar a conversa, ajustar a estrutura e salvar novamente.
          </p>
        </div>

        {errorMessage && (
          <Card className="border-red-200 bg-red-50 text-red-700 p-4">
            {errorMessage}
          </Card>
        )}

        {!canManageScripts && !isLoadingPermissions && (
          <Card className="border-amber-200 bg-amber-50 p-4 text-amber-700">
            Você pode visualizar os roteiros deste workspace, mas não pode criar, editar ou excluir.
          </Card>
        )}

        {isLoadingDrafts ? (
          <Card className="flex min-h-[320px] items-center justify-center">
            <p className="text-text-secondary">Carregando roteiros...</p>
          </Card>
        ) : drafts.length === 0 ? (
          <Card className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Wand2 className="h-6 w-6 text-brand" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text-primary">
              Ainda não há roteiros salvos
            </h3>
            <p className="mb-6 max-w-sm text-text-secondary">
              Gere um roteiro no chat e salve como rascunho para vê-lo aqui.
            </p>
            <Button onClick={() => setSearchParams({ tab: 'ai' })}>Abrir Gerador</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className="cursor-pointer hover:border-brand transition-colors"
                onClick={() => loadDraft(draft)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <Badge variant="brand">Rascunho</Badge>
                  <span className="text-xs text-text-secondary">
                    {new Date(draft.updated_at || draft.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mb-2 line-clamp-1 font-semibold text-text-primary">
                  {draft.title || 'Roteiro sem título'}
                </h3>

                <p className="line-clamp-4 text-sm text-text-secondary">
                  {draft.hook || draft.content}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      loadDraft(draft);
                    }}
                  >
                    Abrir
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteDraft(draft.id);
                    }}
                    disabled={!canManageScripts || isLoadingPermissions}
                  >
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <MessageSquare className="h-6 w-6 text-brand" />
            Gerador de Roteiros com IA
          </h1>
          <p className="text-text-secondary">
            Converse com a PostHub e receba roteiros com gancho forte, retenção, CTA e Social SEO.
          </p>
          {activeProfile && (
            <p className="mt-1 text-sm text-text-secondary">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="brand">Saldo: {creditsBalance} créditos</Badge>
          <Button variant="outline" size="sm" onClick={() => setSearchParams({ tab: 'saved' })}>
            Ver Rascunhos
          </Button>
          <Button variant="ghost" size="sm" onClick={resetComposer}>
            Nova conversa
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</Card>
      )}

      {!canManageScripts && !isLoadingPermissions && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-amber-700">
          Você pode visualizar os roteiros deste workspace, mas não pode salvar, editar ou excluir.
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <Card className="flex min-h-[780px] flex-col p-0">
          <div className="border-b border-gray-100 px-6 py-5">
            <CardTitle>Chat criativo</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              Escreva o tema do vídeo e ajuste o contexto abaixo para refinar a resposta.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAFBFF] px-6 py-6">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-2xl px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'bg-brand text-white'
                      : 'border border-gray-200 bg-white text-text-primary'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                    {message.role === 'user' ? (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Você
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5" />
                        {message.mode === 'ai' ? 'IA PostHub' : 'Assistente'}
                      </>
                    )}
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>

                  {message.creditsUsed ? (
                    <div className="mt-3 inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                      {message.creditsUsed} créditos utilizados
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
                    Estruturando o roteiro com a engenharia da PostHub...
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white px-6 py-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setChatInput(prompt)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-text-primary placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Ex.: Crie um roteiro sobre constância nas redes para social medias que atendem pequenos negócios."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />

            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setGenerationMode('ai')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                    generationMode === 'ai'
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-200 bg-white text-text-secondary hover:border-brand hover:text-brand'
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Usar inteligência
                </button>
                <button
                  onClick={() => setGenerationMode('template')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                    generationMode === 'template'
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-200 bg-white text-text-secondary hover:border-brand hover:text-brand'
                  )}
                >
                  <Wand2 className="h-4 w-4" />
                  Template inteligente
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/30 bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-brand/10 p-2 text-brand">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {generationMode === 'ai'
                        ? `Esta geração usará ${SCRIPT_GENERATION_CREDITS} créditos`
                        : 'Este modo não consome créditos'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {generationMode === 'ai'
                        ? `Saldo atual: ${creditsBalance}. Saldo após gerar: ${Math.max(
                            creditsAfterGeneration,
                            0
                          )}.`
                        : `Seu saldo permanece em ${creditsBalance} créditos.`}
                    </p>
                  </div>
                </div>
                <Badge variant="brand">
                  {generationMode === 'ai' ? 'IA ativa' : 'Modo econômico'}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Objetivo</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={formData.goal}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, goal: event.target.value }))
                    }
                  >
                    <option>Educational / Value</option>
                    <option>Sales / Conversion</option>
                    <option>Entertainment</option>
                    <option>Engagement / Community</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Formato</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={formData.format}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, format: event.target.value }))
                    }
                  >
                    <option>Short Video (Reels/TikTok)</option>
                    <option>Carousel Post</option>
                    <option>YouTube Script</option>
                    <option>Twitter Thread</option>
                  </select>
                </div>

                <Input
                  label="Público-alvo"
                  placeholder="Ex.: Social medias que atendem clínicas"
                  value={formData.audience}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, audience: event.target.value }))
                  }
                />

                <Input
                  label="Nicho"
                  placeholder="Ex.: Marketing para negócios locais"
                  value={formData.niche}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, niche: event.target.value }))
                  }
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Tom</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={formData.tone}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, tone: event.target.value }))
                    }
                  >
                    <option>Professional</option>
                    <option>Casual</option>
                    <option>Energetic</option>
                    <option>Humorous</option>
                    <option>Empathetic</option>
                    <option>Authoritative</option>
                  </select>
                </div>

                <Input
                  label="Palavras-chave"
                  placeholder="Ex.: gestão de redes sociais, crescimento orgânico"
                  value={formData.keywords}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, keywords: event.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => void handleGenerate()}
                  isLoading={isGenerating}
                  className="gap-2"
                >
                  {!isGenerating && <Send className="h-4 w-4" />}
                  Gerar roteiro
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Estrutura da IA</CardTitle>
              <Badge variant="brand">PostHub</Badge>
            </div>
            <div className="space-y-3 text-sm leading-6 text-text-secondary">
              <p>
                A resposta segue o seu raciocínio: mapeamento estratégico, gancho de 3 segundos,
                meio com retenção, CTA específico e camada de Social SEO.
              </p>
              <p>
                O foco não é gerar texto genérico. O foco é montar um roteiro que prenda atenção e
                direcione a ação certa.
              </p>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Roteiro atual</CardTitle>
              {generatedScript ? <Badge variant="brand">Pronto para editar</Badge> : null}
            </div>

            {!generatedScript ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-text-secondary">
                Envie um tema no chat para montar o roteiro. Quando a resposta chegar, você pode
                editar os blocos aqui, copiar ou salvar como rascunho.
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Título"
                  value={generatedScript.title}
                  onChange={(event) =>
                    setGeneratedScript((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev
                    )
                  }
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Gancho</label>
                  <textarea
                    className="min-h-[110px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={generatedScript.hook}
                    onChange={(event) =>
                      setGeneratedScript((prev) =>
                        prev ? { ...prev, hook: event.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Meio / Retenção</label>
                  <textarea
                    className="min-h-[180px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={generatedScript.content}
                    onChange={(event) =>
                      setGeneratedScript((prev) =>
                        prev ? { ...prev, content: event.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    B-rolls / Direção de arte
                  </label>
                  <textarea
                    className="min-h-[150px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={generatedScript.examples}
                    onChange={(event) =>
                      setGeneratedScript((prev) =>
                        prev ? { ...prev, examples: event.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">CTA</label>
                  <textarea
                    className="min-h-[90px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={generatedScript.cta}
                    onChange={(event) =>
                      setGeneratedScript((prev) =>
                        prev ? { ...prev, cta: event.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Legenda / Social SEO</label>
                  <textarea
                    className="min-h-[160px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={generatedScript.caption}
                    onChange={(event) =>
                      setGeneratedScript((prev) =>
                        prev ? { ...prev, caption: event.target.value } : prev
                      )
                    }
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-text-primary">
                    Engenharia aplicada
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-6 text-text-secondary">
                    {generatedScript.reasoning}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleCopy} variant="outline" className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar roteiro'}
                  </Button>
                  <Button
                    onClick={() => void handleSaveDraft()}
                    variant="secondary"
                    className="gap-2"
                    disabled={!canManageScripts || isLoadingPermissions}
                  >
                    {isSaved ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {isSaved ? 'Salvo!' : editingDraftId ? 'Atualizar rascunho' : 'Salvar rascunho'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Últimos rascunhos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({ tab: 'saved' })}>
                Ver todos
              </Button>
            </div>

            {isLoadingDrafts ? (
              <p className="text-sm text-text-secondary">Carregando rascunhos...</p>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Seus próximos roteiros salvos aparecerão aqui.
              </p>
            ) : (
              <div className="space-y-3">
                {drafts.slice(0, 3).map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => loadDraft(draft)}
                    className="w-full rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-brand hover:bg-brand/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-text-primary">{draft.title || 'Sem título'}</p>
                      <span className="text-xs text-text-secondary">
                        {new Date(draft.updated_at || draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                      {draft.hook || draft.content}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
