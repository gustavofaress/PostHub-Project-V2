import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wand2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Sparkles,
  FileText,
} from 'lucide-react';

import { Card, CardTitle } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';

const STEPS = [
  { id: 1, title: 'Contexto', description: 'Sobre o que é isso?' },
  { id: 2, title: 'Detalhes', description: 'Formato e público' },
  { id: 3, title: 'Tom', description: 'Como deve soar?' },
  { id: 4, title: 'Prévia', description: 'Revise e copie' },
];

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

export const ScriptGenerator = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSavedView = searchParams.get('tab') === 'saved';

  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [editingDraftId, setEditingDraftId] = React.useState<string | null>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    topic: '',
    goal: 'Educational / Value',
    format: 'Short Video (Reels/TikTok)',
    audience: '',
    niche: '',
    tone: '',
    keywords: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [drafts, setDrafts] = React.useState<ScriptDraft[]>([]);

  const [generatedScript, setGeneratedScript] = React.useState<{
    hook: string;
    content: string;
    examples: string;
    cta: string;
  } | null>(null);

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.topic.trim()) newErrors.topic = 'O tema é obrigatório';
    } else if (step === 2) {
      if (!formData.audience.trim()) newErrors.audience = 'O público é obrigatório';
      if (!formData.niche.trim()) newErrors.niche = 'O nicho é obrigatório';
    } else if (step === 3) {
      if (!formData.tone) newErrors.tone = 'Selecione um tom';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    const v = normalizeString(goal);

    if (v.includes('sales') || v.includes('conversion')) return 'venda';
    if (v.includes('engagement') || v.includes('community')) return 'engajamento';
    if (v.includes('educational') || v.includes('value')) return 'autoridade';
    if (v.includes('entertainment')) return 'conexao';

    return 'autoridade';
  }

  function normalizeFormat(format: string): ScriptFormat {
    const v = normalizeString(format);

    if (v.includes('short_video') || v.includes('reels') || v.includes('tiktok')) return 'video_falado';
    if (v.includes('carousel')) return 'lista';
    if (v.includes('youtube')) return 'storytelling';
    if (v.includes('twitter') || v.includes('thread')) return 'lista';

    return 'video_falado';
  }

  function normalizeTone(tone: string): ScriptTone {
    const v = normalizeString(tone);

    if (v.includes('professional')) return 'didatico';
    if (v.includes('casual')) return 'direto';
    if (v.includes('energetic')) return 'inspirador';
    if (v.includes('humorous')) return 'opinativo';
    if (v.includes('empathetic')) return 'emocional';
    if (v.includes('authoritative')) return 'provocativo';

    return 'direto';
  }

  function inferHookType(): ScriptHookType {
    const objective = normalizeObjective(formData.goal);
    const tone = normalizeTone(formData.tone);
    const keywordText = normalizeString(formData.keywords);

    if (keywordText.includes('erro') || keywordText.includes('mistake')) return 'erro_comum';
    if (keywordText.includes('resultado') || keywordText.includes('result')) return 'resultado';
    if (objective === 'venda') return 'promessa';
    if (tone === 'provocativo') return 'polemico';
    if (tone === 'emocional') return 'curiosidade';
    if (normalizeFormat(formData.format) === 'lista') return 'promessa';

    return 'curiosidade';
  }

  function selectBestTemplate() {
    const objetivo = normalizeObjective(formData.goal);
    const formato = normalizeFormat(formData.format);
    const tom = normalizeTone(formData.tone);
    const gancho = inferHookType();

    const scored = SCRIPT_TEMPLATES.map((template) => {
      let score = template.prioridade;

      if (template.objetivos.includes(objetivo)) score += 4;
      if (template.formatos.includes(formato)) score += 5;
      if (template.tons.includes(tom)) score += 3;
      if (template.ganchos.includes(gancho)) score += 3;

      return { template, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.template ?? SCRIPT_TEMPLATES[0];
  }

  function pick<T>(items: T[], seed: string): T {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % items.length;
    return items[index];
  }

  function appendField(base: string, next: string) {
    if (!base.trim()) return next.trim();
    if (!next.trim()) return base.trim();
    return `${base.trim()}\n\n${next.trim()}`;
  }

  function getKeywordsList() {
    return formData.keywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function buildSentenceForStep(step: ScriptTemplateStep, templateId: string) {
    const topic = formData.topic || 'your topic';
    const audience = formData.audience || 'your audience';
    const niche = formData.niche || 'your niche';
    const tone = formData.tone || 'your tone';
    const keywords = getKeywordsList();
    const objective = normalizeObjective(formData.goal);
    const seed = `${templateId}_${step.etapa}_${topic}_${audience}_${niche}_${tone}_${formData.goal}_${formData.format}_${formData.keywords}`;

    const library: Record<string, string[]> = {
      hook: [
        `Everyone is talking about ${topic} the wrong way.`,
        `If you still think ${topic} is just about doing more, you're missing the point.`,
        `Most people targeting ${audience} make the same mistake with ${topic}.`,
        `There is a smarter way to approach ${topic} in ${niche}.`,
        `What if the real problem with ${topic} is not what people think it is?`,
      ],
      beneficio: [
        `And once you understand this, everything becomes clearer and much easier to apply.`,
        `Because this small shift can completely change the way you get results.`,
        `This is the kind of insight that saves time, energy, and bad decisions.`,
      ],
      contexto: [
        `In ${niche}, this shows up all the time.`,
        `If you are creating for ${audience}, you have probably seen this pattern before.`,
        `Most creators in ${niche} focus on volume first, and strategy second.`,
        `The truth is that ${tone.toLowerCase()} content only works when the structure behind it makes sense.`,
      ],
      identificacao: [
        `You may even be doing this right now without noticing.`,
        `And that is why so many people stay stuck even while posting consistently.`,
        `It feels right at first, but that is exactly what makes it dangerous.`,
      ],
      argumento: [
        `The real game is not about doing more. It is about doing what makes sense for the right audience.`,
        `Consistency without direction creates effort, not momentum.`,
        `What actually moves the needle is clarity, structure, and intentional messaging.`,
      ],
      explicacao: [
        `The mistake is trying to improve performance without fixing the foundation first.`,
        `When the message is unclear, even good content loses strength.`,
        `If the structure is weak, attention drops before the value appears.`,
      ],
      correcao: [
        `The better move is to organize the message before trying to scale the output.`,
        `You need a clearer hook, stronger development, and a more intentional CTA.`,
        `Fix the thinking first, then optimize the execution.`,
      ],
      aplicacao: [
        `In practice, this means revisiting your opening, your angle, and the final action you want from the audience.`,
        `Start with a sharper promise, build a cleaner line of reasoning, and finish with a clear direction.`,
        `A simple adjustment in structure already improves how the audience receives the message.`,
      ],
      conflito: [
        `But then a problem showed up: what seemed simple at first was not actually working in practice.`,
        `That is when the gap between theory and execution became obvious.`,
        `And right in the middle of the process, I realized the real issue was somewhere else.`,
      ],
      virada: [
        `Everything changed when the focus moved from content volume to content structure.`,
        `The turning point came when strategy replaced improvisation.`,
        `That shift completely changed how the message landed.`,
      ],
      aprendizado: [
        `The lesson is simple: better content starts with better structure.`,
        `In the end, the biggest win was not just performance. It was clarity.`,
        `Once you understand this, every new piece of content gets easier to build.`,
      ],
      lista: [
        `1. Start with a clearer angle around ${topic}.`,
        `2. Speak directly to ${audience} instead of trying to please everyone.`,
        `3. Use stronger examples from ${niche} to make the message land.`,
      ],
      rehook: [
        `And the second point is where most people get it wrong.`,
        `Now here is the part that really changes the game.`,
        `This next detail is what separates average content from strategic content.`,
      ],
      fechamento: [
        `That is what makes content feel more strategic and less random.`,
        `And this is where execution starts to become more predictable.`,
        `When you do this consistently, your message becomes much stronger.`,
      ],
      problema: [
        `The problem starts when people confuse effort with direction.`,
        `Most creators stay stuck because they are producing without a clear structure.`,
        `The issue is not lack of action. It is lack of alignment.`,
      ],
      mudanca: [
        `The shift happens when you replace improvisation with a process.`,
        `Results improve when every part of the script has a clear job.`,
        `This becomes easier once your structure is doing the heavy lifting.`,
      ],
      resultado: [
        `That leads to more clarity, stronger retention, and better conversion potential.`,
        `The result is content that feels more intentional and performs more predictably.`,
        `That is when your script starts working with you instead of against you.`,
      ],
      reacao: [
        `My first reaction was that most people would miss the real lesson here.`,
        `At first glance this looks simple, but there is a deeper strategic layer behind it.`,
        `The obvious takeaway is not the most valuable one.`,
      ],
      analise: [
        `Strategically, this shows how structure matters more than surface-level execution.`,
        `What is interesting here is not just the format, but the reasoning behind it.`,
        `The deeper insight is about positioning, clarity, and message sequencing.`,
      ],
      insight: [
        `What few people notice is that attention comes from format, but retention comes from structure.`,
        `The real advantage is not doing something flashy. It is making the message easier to understand.`,
        `The hidden win is how this improves perception and action at the same time.`,
      ],
      passos: [
        `Step 1: define the main promise of ${topic}.`,
        `Step 2: organize the message so ${audience} understands it fast.`,
        `Step 3: deliver a simple and practical path to action.`,
      ],
      simplificacao: [
        `The good news is that this does not need to be complicated.`,
        `The clearer the logic, the easier it becomes to repeat this consistently.`,
        `Simple structure almost always beats messy complexity.`,
      ],
      erro: [
        `The biggest mistake is trying to do everything at once.`,
        `Most people overcomplicate before mastering the basics.`,
        `A weak beginning can ruin a strong idea.`,
      ],
      metodo: [
        `The method was to define a stronger message, build cleaner blocks, and guide the audience more intentionally.`,
        `What worked was replacing guesswork with a repeatable structure.`,
        `The improvement came from making every part of the script serve a purpose.`,
      ],
      prova: [
        `And the proof appears in better clarity, stronger retention, and more audience response.`,
        `This is the kind of change that shows up in how people watch, react, and remember.`,
        `The result is not random. It comes from a more intentional structure.`,
      ],
      generalizacao: [
        `And this logic is not limited to one niche. It can be adapted across different markets.`,
        `That is why this works for more than one type of creator or business.`,
        `The principle holds up because the audience always responds better to clarity.`,
      ],
      cta: [
        objective === 'venda'
          ? `If you want to apply this to your own content, send me a message or comment a keyword below.`
          : objective === 'engajamento'
          ? `Do you agree or disagree? Drop your opinion in the comments.`
          : `Save this so you can use this structure in your next piece of content.`,
        `If this helped, save it and send it to someone who needs this.`,
        `Follow for more strategic content ideas like this.`,
      ],
    };

    const options = library[step.etapa] ?? [`Strategic block about ${topic}.`];
    const text = pick(options, seed);

    if ((step.etapa === 'lista' || step.etapa === 'passos') && keywords.length > 0) {
      return `${text}\n${keywords
        .slice(0, 3)
        .map((keyword, index) => `${index + 1}. Connect this idea to ${keyword}.`)
        .join('\n')}`;
    }

    return text;
  }

  const generateStructuredScript = () => {
    const template = selectBestTemplate();

    const fields: Record<ScriptDbField, string> = {
      hook: '',
      context: '',
      main_tips: '',
      examples: '',
      cta: '',
    };

    for (const step of template.estrutura) {
      const sentence = buildSentenceForStep(step, template.id);

      if (step.append) {
        fields[step.campo_db] = appendField(fields[step.campo_db], sentence);
      } else {
        fields[step.campo_db] = sentence;
      }
    }

    const content = [fields.context, fields.main_tips]
      .filter(Boolean)
      .join('\n\n');

    return {
      hook: fields.hook,
      content,
      examples: fields.examples,
      cta: fields.cta,
    };
  };

  const buildContextText = () => {
    return [
      `Objetivo: ${formData.goal}`,
      `Formato: ${formData.format}`,
      `Público: ${formData.audience}`,
      `Nicho: ${formData.niche}`,
      `Tom: ${formData.tone}`,
      `Palavras-chave: ${formData.keywords || '-'}`,
    ].join('\n');
  };

  const buildFullContent = (script: {
    hook: string;
    content: string;
    examples: string;
    cta: string;
  }) => {
    return [script.hook, script.content, script.examples, script.cta]
      .filter(Boolean)
      .join('\n\n');
  };

  const resetForm = () => {
    setFormData({
      topic: '',
      goal: 'Educational / Value',
      format: 'Short Video (Reels/TikTok)',
      audience: '',
      niche: '',
      tone: '',
      keywords: '',
    });
    setGeneratedScript(null);
    setCurrentStep(1);
    setErrors({});
    setEditingDraftId(null);
    setErrorMessage(null);
  };

  const handleReset = () => {
    resetForm();
  };

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
        .eq('user_id', user.id)
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

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 3) {
      if (generatedScript) {
        setCurrentStep(4);
      } else {
        setIsGenerating(true);
        setTimeout(() => {
          setGeneratedScript(generateStructuredScript());
          setIsGenerating(false);
          setCurrentStep(4);
        }, 1500);
      }
    } else if (currentStep === 4) {
      handleReset();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => setCurrentStep(currentStep - 1);

  const handleCopy = () => {
    if (!generatedScript) return;

    const text = buildFullContent(generatedScript);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = async () => {
    if (!generatedScript) return;

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

    setErrorMessage(null);

    const payload = {
      user_id: user.id,
      profile_id: activeProfile.id,
      title: formData.topic.trim() || 'Roteiro sem título',
      hook: generatedScript.hook,
      context: buildContextText(),
      main_tips: generatedScript.content,
      examples: generatedScript.examples,
      cta: generatedScript.cta,
      content: buildFullContent(generatedScript),
      updated_at: new Date().toISOString(),
      source: 'manual_generator',
      is_favorite: false,
    };

    try {
      if (editingDraftId) {
        const { data, error } = await supabase
          .from('script_drafts')
          .update(payload)
          .eq('id', editingDraftId)
          .eq('user_id', user.id)
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
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error: any) {
      console.error('[Scripts] Error saving draft:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar o roteiro.');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!supabase || !user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    try {
      const { error } = await supabase
        .from('script_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', user.id);

      if (error) throw error;

      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));

      if (editingDraftId === draftId) {
        resetForm();
      }
    } catch (error: any) {
      console.error('[Scripts] Error deleting draft:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir o roteiro.');
    }
  };

  const loadDraft = (draft: ScriptDraft) => {
    setEditingDraftId(draft.id);

    setFormData({
      topic: draft.title || '',
      goal: 'Educational / Value',
      format: 'Short Video (Reels/TikTok)',
      audience: '',
      niche: '',
      tone: '',
      keywords: '',
    });

    setGeneratedScript({
      hook: draft.hook || '',
      content: draft.main_tips || '',
      examples: draft.examples || '',
      cta: draft.cta || '',
    });

    setCurrentStep(4);
    setErrors({});
    setErrorMessage(null);
    setSearchParams({ tab: 'ai' });
  };

  if (isSavedView) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand" />
            Roteiros Salvos
          </h1>
          <p className="text-text-secondary">
            Gerencie e edite seus roteiros gerados anteriormente.
          </p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        {errorMessage && (
          <Card className="border-red-200 bg-red-50 text-red-700 p-4">
            {errorMessage}
          </Card>
        )}

        {isLoadingDrafts ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
            <p className="text-text-secondary">Carregando roteiros...</p>
          </Card>
        ) : drafts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
            <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
              <Wand2 className="h-6 w-6 text-brand" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Ainda não há roteiros salvos
            </h3>
            <p className="text-text-secondary max-w-sm mb-6">
              Gere seu primeiro roteiro e salve-o como rascunho para vê-lo aqui.
            </p>
            <Button onClick={() => setSearchParams({ tab: 'ai' })}>
              Criar Novo Roteiro
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className="cursor-pointer hover:border-brand transition-all flex flex-col"
                onClick={() => loadDraft(draft)}
              >
                <div className="flex justify-between items-start mb-3 gap-3">
                  <Badge variant="brand">Rascunho</Badge>
                  <span className="text-xs text-text-secondary">
                    {new Date(draft.updated_at || draft.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-semibold text-text-primary mb-2 line-clamp-1">
                  {draft.title || 'Roteiro sem título'}
                </h3>

                <p className="text-sm text-text-secondary line-clamp-3 flex-1">
                  {draft.hook || draft.content}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadDraft(draft);
                    }}
                  >
                    Abrir
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteDraft(draft.id);
                    }}
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-brand" />
            Gerador de Roteiros
          </h1>
          <p className="text-text-secondary">
            Gere roteiros de alta conversão para o seu conteúdo nas redes sociais.
          </p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        {currentStep > 1 && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            Começar de Novo
          </Button>
        )}
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      <div className="flex items-center justify-between px-4">
        {STEPS.map((step) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center font-bold transition-all',
                  currentStep === step.id
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  currentStep === step.id ? 'text-brand' : 'text-text-secondary'
                )}
              >
                {step.title}
              </span>
            </div>

            {step.id < 4 && (
              <div
                className={cn(
                  'h-px w-16 mx-4 mb-6',
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card className="min-h-[400px] flex flex-col">
        <div className="flex-1">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardTitle>Contexto e Objetivo</CardTitle>
              <div className="space-y-4">
                <Input
                  label="Tema Principal"
                  placeholder="Ex.: 5 dicas para melhorar a produtividade"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  error={errors.topic}
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Qual é o objetivo principal?
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  >
                    <option>Educational / Value</option>
                    <option>Sales / Conversion</option>
                    <option>Entertainment</option>
                    <option>Engagement / Community</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardTitle>Formato e Público</CardTitle>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Formato do Conteúdo
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  >
                    <option>Short Video (Reels/TikTok)</option>
                    <option>Carousel Post</option>
                    <option>YouTube Script</option>
                    <option>Twitter Thread</option>
                  </select>
                </div>

                <Input
                  label="Público-Alvo"
                  placeholder="Ex.: Jovens empreendedores"
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  error={errors.audience}
                />
              </div>

              <Input
                label="Nicho"
                placeholder="Ex.: Marketing Digital"
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                error={errors.niche}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardTitle>Tom e Estilo</CardTitle>

              <div className="grid grid-cols-3 gap-3">
                {[
                  'Professional',
                  'Casual',
                  'Energetic',
                  'Humorous',
                  'Empathetic',
                  'Authoritative',
                ].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setFormData({ ...formData, tone })}
                    className={cn(
                      'flex items-center justify-center rounded-lg border p-4 text-sm font-medium transition-all',
                      formData.tone === tone
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-gray-200 hover:border-brand hover:bg-brand/5'
                    )}
                  >
                    {tone === 'Professional'
                      ? 'Profissional'
                      : tone === 'Casual'
                      ? 'Casual'
                      : tone === 'Energetic'
                      ? 'Energético'
                      : tone === 'Humorous'
                      ? 'Humorístico'
                      : tone === 'Empathetic'
                      ? 'Empático'
                      : 'Autoritativo'}
                  </button>
                ))}
              </div>

              {errors.tone && <p className="text-xs text-red-500">{errors.tone}</p>}

              <Input
                label="Palavras-chave específicas para incluir"
                placeholder="Ex.: produtividade, hacks, gestão do tempo"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              />
            </div>
          )}

          {currentStep === 4 && generatedScript && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <CardTitle>Roteiro Gerado</CardTitle>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsGenerating(true);
                      setTimeout(() => {
                        setGeneratedScript(generateStructuredScript());
                        setIsGenerating(false);
                      }, 1500);
                    }}
                    className="gap-2"
                    isLoading={isGenerating}
                  >
                    {!isGenerating && <Sparkles className="h-4 w-4" />}
                    Regenerar
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleSaveDraft()}
                    className="gap-2"
                  >
                    {isSaved ? <Check className="h-4 w-4" /> : null}
                    {isSaved ? 'Salvo!' : 'Salvar Rascunho'}
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar Roteiro'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  className="w-full rounded-lg bg-gray-50 p-4 font-mono text-sm leading-relaxed text-text-primary border border-gray-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y min-h-[100px]"
                  value={generatedScript.hook}
                  onChange={(e) =>
                    setGeneratedScript({ ...generatedScript, hook: e.target.value })
                  }
                  placeholder="Gancho"
                />

                <textarea
                  className="w-full rounded-lg bg-gray-50 p-4 font-mono text-sm leading-relaxed text-text-primary border border-gray-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y min-h-[120px]"
                  value={generatedScript.content}
                  onChange={(e) =>
                    setGeneratedScript({ ...generatedScript, content: e.target.value })
                  }
                  placeholder="Desenvolvimento"
                />

                <textarea
                  className="w-full rounded-lg bg-gray-50 p-4 font-mono text-sm leading-relaxed text-text-primary border border-gray-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y min-h-[120px]"
                  value={generatedScript.examples}
                  onChange={(e) =>
                    setGeneratedScript({ ...generatedScript, examples: e.target.value })
                  }
                  placeholder="Exemplos"
                />

                <textarea
                  className="w-full rounded-lg bg-gray-50 p-4 font-mono text-sm leading-relaxed text-text-primary border border-gray-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y min-h-[80px]"
                  value={generatedScript.cta}
                  onChange={(e) =>
                    setGeneratedScript({ ...generatedScript, cta: e.target.value })
                  }
                  placeholder="Chamada para ação"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isGenerating}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Button onClick={handleNext} isLoading={isGenerating} className="gap-2">
            {currentStep === 3 ? (
              <>
                {!generatedScript && <Sparkles className="h-4 w-4" />}
                {generatedScript ? 'Próximo' : 'Gerar Roteiro'}
              </>
            ) : currentStep === 4 ? (
              'Finalizar'
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
