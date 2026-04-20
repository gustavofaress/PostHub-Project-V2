import * as React from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  MessageCircleMore,
  Search,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';
import { SUPPORT_WHATSAPP_URL } from '../../shared/constants/support';
import { HIDDEN_WORKSPACE_MODULE_IDS } from '../../shared/constants/navigation';

type HelpStatus = 'Disponivel agora' | 'Disponivel com escopo parcial' | 'Em evolucao';

interface HelpQuestion {
  question: string;
  answer: string;
}

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  status: HelpStatus;
  summary: string;
  keywords: string[];
  questions: HelpQuestion[];
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'onboarding',
    title: 'Onboarding e Setup Inicial',
    category: 'Primeiros passos',
    status: 'Disponivel agora',
    summary:
      'O onboarding coleta o contexto da sua operacao e libera um checklist inicial para voce criar ideia, estruturar conteudo, levar para o calendario e finalizar a configuracao do workspace.',
    keywords: ['setup', 'inicio', 'primeiro acesso', 'quiz', 'checklist'],
    questions: [
      {
        question: 'Para que serve o quiz inicial?',
        answer:
          'O quiz registra modelo de trabalho, tamanho da operacao e processo atual. Essas respostas ficam vinculadas ao usuario e ajudam a personalizar a mensagem inicial e o contexto da conta.',
      },
      {
        question: 'O que eu preciso fazer para concluir o setup?',
        answer:
          'O fluxo sugerido hoje e: criar a primeira ideia, abrir o gerador de roteiros, organizar no calendario e depois ir para o dashboard. Ao finalizar, o sistema marca o setup como concluido.',
      },
      {
        question: 'Se eu fechar o onboarding, perco minhas respostas?',
        answer:
          'Nao. Quando o quiz e salvo, as respostas ficam registradas na conta. O modulo deixa de abrir como primeira etapa obrigatoria, mas os dados continuam disponiveis em Conta.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    category: 'Visao geral',
    status: 'Disponivel agora',
    summary:
      'O dashboard e o painel de visao geral do perfil ativo. Ele consolida contagem de ideias, roteiros, itens do calendario e aprovacoes pendentes, alem de exibir atividade recente da operacao.',
    keywords: ['dashboard', 'visao geral', 'resumo', 'metricas internas'],
    questions: [
      {
        question: 'Os numeros do dashboard mudam conforme o perfil ativo?',
        answer:
          'Sim. O dashboard busca os dados do perfil selecionado naquele momento. Se voce trocar o perfil, o resumo e recalculado com base nesse contexto.',
      },
      {
        question: 'O dashboard mostra dados de redes sociais ou dados da operacao?',
        answer:
          'Hoje ele mostra principalmente dados internos da operacao: quantidade de ideias, roteiros, posts agendados e revisoes pendentes. As metricas de Instagram ficam no modulo de Performance.',
      },
      {
        question: 'Por que o dashboard pode aparecer vazio?',
        answer:
          'Se nao houver perfil ativo, conteudo criado ou aprovacoes registradas, o dashboard fica sem volume para consolidar. O ideal e alimentar primeiro Ideias, Roteiros, Calendario e Aprovacao.',
      },
    ],
  },
  {
    id: 'scripts',
    title: 'Gerador de Roteiros',
    category: 'Criacao',
    status: 'Disponivel agora',
    summary:
      'O Gerador de Roteiros guia o usuario em etapas de contexto, detalhes, tom e previa. Com base nas escolhas, o sistema monta um roteiro estruturado e permite copiar, salvar, reabrir e excluir rascunhos por perfil.',
    keywords: ['roteiro', 'script', 'gerador', 'rascunho', 'copiar'],
    questions: [
      {
        question: 'Como o gerador cria o roteiro?',
        answer:
          'O fluxo usa as informacoes preenchidas para selecionar uma estrutura de roteiro e montar blocos como hook, desenvolvimento, exemplos e CTA. No fim, tudo e reunido em uma previa pronta para copiar ou salvar.',
      },
      {
        question: 'Onde ficam os roteiros salvos?',
        answer:
          'Os roteiros ficam salvos no banco como rascunhos do perfil ativo e podem ser revisitados pela aba de roteiros salvos. Ali voce consegue abrir novamente um texto, editar e excluir se necessario.',
      },
      {
        question: 'Preciso terminar todas as etapas para salvar?',
        answer:
          'Sim. O salvamento acontece quando ja existe uma previa gerada. Antes disso, o modulo valida os campos essenciais de cada etapa para garantir um roteiro minimamente estruturado.',
      },
    ],
  },
  {
    id: 'ideas',
    title: 'Banco de Ideias',
    category: 'Criacao',
    status: 'Disponivel agora',
    summary:
      'O Banco de Ideias organiza ideias por perfil com titulo, tags, prioridade e status. Voce pode criar, editar, filtrar, buscar, excluir e usar esse acervo como ponto de partida da operacao.',
    keywords: ['ideias', 'backlog', 'tags', 'prioridade', 'filtro'],
    questions: [
      {
        question: 'O que vale a pena cadastrar no Banco de Ideias?',
        answer:
          'Tudo o que possa virar conteudo depois: temas, ganchos, observacoes e pautas. O modulo foi pensado para centralizar inspiracoes e manter a fila de producao organizada.',
      },
      {
        question: 'Como funcionam as tags, prioridade e status?',
        answer:
          'As tags ajudam na categorizacao, a prioridade sinaliza urgencia e o status indica a fase da ideia dentro do backlog. Esses campos tambem alimentam os filtros da tela.',
      },
      {
        question: 'Consigo transformar uma ideia em roteiro?',
        answer:
          'Sim, o modulo ja tem atalho para abrir o Gerador de Roteiros. Hoje ele leva voce para o modulo de roteiro, onde a estruturacao continua.',
      },
    ],
  },
  {
    id: 'approval',
    title: 'Aprovacao de Conteudo',
    category: 'Operacao',
    status: 'Disponivel agora',
    summary:
      'O modulo de Aprovacao centraliza criacao de pecas para revisao, upload de midia, geracao de link publico, historico de comentarios e atualizacao de status como aprovado, alteracoes solicitadas ou rejeitado.',
    keywords: ['aprovacao', 'cliente', 'link publico', 'feedback', 'comentarios'],
    questions: [
      {
        question: 'Como envio uma peca para o cliente aprovar?',
        answer:
          'Voce cria o item de aprovacao, adiciona titulo, legenda, plataforma e midia. Depois gera um link publico para compartilhar com quem vai revisar, sem exigir login.',
      },
      {
        question: 'O cliente consegue comentar sem ter conta?',
        answer:
          'Sim. O fluxo foi pensado para revisao externa por link publico. O feedback volta para o historico do item aprovado ou em revisao.',
      },
      {
        question: 'O modulo aceita imagem e video?',
        answer:
          'Sim. O upload aceita imagem e video. No caso de video, o sistema tenta compactar antes do envio quando o arquivo esta pesado demais para o fluxo definido.',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendario Editorial',
    category: 'Operacao',
    status: 'Disponivel agora',
    summary:
      'O Calendario Editorial registra posts por perfil e organiza a operacao por data. Hoje voce consegue criar, editar e excluir itens com titulo, descricao, data e status diretamente na agenda.',
    keywords: ['calendario', 'editorial', 'agenda', 'planejamento', 'datas'],
    questions: [
      {
        question: 'O calendario serve para planejar ou para publicar?',
        answer:
          'Hoje ele serve para planejar e organizar. O modulo registra o conteudo na agenda editorial, mas nao executa publicacao automatica por si so.',
      },
      {
        question: 'Quais informacoes ficam em cada item?',
        answer:
          'Cada item guarda titulo, descricao, data agendada e status. Isso permite acompanhar a programacao do mes e usar esses dados em outros modulos, como dashboard, relatorios e kanban.',
      },
      {
        question: 'Se eu editar uma data, o calendario atualiza na hora?',
        answer:
          'Sim. As alteracoes sao persistidas no banco do perfil ativo e a grade do calendario e recalculada com base nesses registros.',
      },
    ],
  },
  {
    id: 'kanban',
    title: 'Kanban de Producao',
    category: 'Operacao',
    status: 'Disponivel agora',
    summary:
      'O Kanban organiza o conteudo em colunas de producao e reaproveita itens do calendario editorial como cards. Voce pode criar colunas padrao, renomear etapas, mover tarefas entre fases e editar cards.',
    keywords: ['kanban', 'producao', 'colunas', 'cards', 'status'],
    questions: [
      {
        question: 'De onde vem os cards do kanban?',
        answer:
          'Os cards sao derivados dos itens do calendario editorial do perfil ativo. O kanban usa essas entradas para representar o andamento da producao em formato visual.',
      },
      {
        question: 'Mover um card altera o status do conteudo?',
        answer:
          'Sim. O nome da coluna e usado para inferir o status operacional, como planejamento, rascunho, revisao ou publicado.',
      },
      {
        question: 'Posso personalizar as colunas?',
        answer:
          'Sim. Se ainda nao houver colunas, o sistema cria uma estrutura padrao. Depois disso, voce pode renomear e organizar conforme o seu fluxo.',
      },
    ],
  },
  {
    id: 'scheduler',
    title: 'Agendador de Conteudo',
    category: 'Publicacao',
    status: 'Em evolucao',
    summary:
      'O Agendador hoje apresenta a visao de fila de publicacoes, melhores horarios e status de publicacao automatica. Ele funciona como vitrine da operacao de agenda, mas o fluxo completo de automacao ainda esta em evolucao.',
    keywords: ['agendador', 'fila', 'publicacao', 'horarios', 'auto publisher'],
    questions: [
      {
        question: 'Ja da para publicar automaticamente por aqui?',
        answer:
          'Ainda nao em fluxo completo dentro desta tela. O modulo mostra a experiencia planejada de fila, horarios recomendados e status operacional, mas a automacao total ainda esta em evolucao.',
      },
      {
        question: 'Os horarios sugeridos sao configuracoes ou referencia?',
        answer:
          'Hoje aparecem como referencia visual de melhores horarios por plataforma. O objetivo do modulo e orientar a rotina de agendamento.',
      },
      {
        question: 'Posso tratar este modulo como fila operacional?',
        answer:
          'Sim, como leitura de agenda e visao de status. Para controle efetivo dos itens, hoje o calendario editorial segue sendo a base mais concreta da operacao.',
      },
    ],
  },
  {
    id: 'performance',
    title: 'Performance',
    category: 'Analise',
    status: 'Disponivel com escopo parcial',
    summary:
      'O modulo de Performance trabalha com conexoes reais do Instagram Business via Meta. Ele lista contas conectadas, sincroniza metricas, consolida alcance, impressoes, engajamento e ranking de posts quando os dados existem.',
    keywords: ['performance', 'instagram', 'meta', 'metricas', 'sincronizacao'],
    questions: [
      {
        question: 'Quais dados aparecem em Performance?',
        answer:
          'Hoje o foco esta nas metricas do Instagram conectadas via Meta, como curtidas, comentarios, contas engajadas, alcance, impressoes, visualizacoes de perfil e posts com melhor performance.',
      },
      {
        question: 'Por que o modulo pode aparecer vazio?',
        answer:
          'Se nao houver uma conta Business conectada, se a sincronizacao ainda nao tiver rodado ou se a Meta nao tiver retornado metricas por midia, a tela mostra estados vazios ou parciais.',
      },
      {
        question: 'Preciso conectar em Integracoes primeiro?',
        answer:
          'Sim. A jornada correta e conectar o Instagram em Integracoes e depois sincronizar os dados. A partir disso, Performance passa a ler os snapshots e montar os cards e rankings.',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Relatorios',
    category: 'Analise',
    status: 'Disponivel agora',
    summary:
      'O modulo de Relatorios monta uma previa consolidada com base nas ideias, roteiros, calendario e aprovacoes do perfil ativo. Tambem permite escolher periodo, ligar ou desligar secoes e exportar o material em PDF.',
    keywords: ['relatorio', 'pdf', 'exportar', 'periodo', 'cliente'],
    questions: [
      {
        question: 'De onde saem os dados do relatorio?',
        answer:
          'Os dados sao agregados a partir dos modulos internos da operacao, principalmente Ideias, Roteiros, Calendario e Aprovacao. O relatorio resume esse movimento em uma visao executiva.',
      },
      {
        question: 'Posso personalizar o que entra no PDF?',
        answer:
          'Sim. O modulo permite definir periodo, nome do relatorio, nome do cliente, notas finais e ligar ou desligar blocos como KPIs, atividade, insights e observacoes.',
      },
      {
        question: 'O PDF ja sai pronto para compartilhar?',
        answer:
          'Sim. A exportacao gera um arquivo PDF com a configuracao montada na tela. A ideia e facilitar o envio do material final para cliente ou time.',
      },
    ],
  },
  {
    id: 'references',
    title: 'Referencias',
    category: 'Criacao',
    status: 'Disponivel agora',
    summary:
      'O modulo de Referencias centraliza links, imagens, videos e gravacoes de tela para inspiracao criativa. Voce consegue cadastrar fonte, tags, pasta, campanha, plataforma, observacoes e fazer busca por esse acervo.',
    keywords: ['referencias', 'links', 'imagem', 'video', 'inspiracao'],
    questions: [
      {
        question: 'Que tipo de material posso salvar em Referencias?',
        answer:
          'Voce pode salvar links externos, imagens, videos e gravacoes de tela. O objetivo e manter todo o repertorio criativo reunido dentro do perfil.',
      },
      {
        question: 'Como funciona a organizacao das referencias?',
        answer:
          'Cada item pode receber titulo, descricao, fonte, tags, pasta, campanha, plataforma, formato e observacoes. Isso ajuda na busca posterior e no reaproveitamento das referencias.',
      },
      {
        question: 'O modulo faz upload de arquivo ou so guarda link?',
        answer:
          'Ele faz os dois. Voce pode cadastrar links de publicacoes ou enviar arquivos de imagem e video. No caso de video, o sistema tambem trabalha com compactacao quando necessario.',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integracoes',
    category: 'Conexoes',
    status: 'Disponivel com escopo parcial',
    summary:
      'O modulo de Integracoes e o ponto de conexao com plataformas externas. Hoje o fluxo real mais avancado e o do Instagram via Meta OAuth, com leitura das contas conectadas e sincronizacao de metricas.',
    keywords: ['integracoes', 'instagram', 'oauth', 'meta', 'conectar'],
    questions: [
      {
        question: 'Quais integracoes ja funcionam de verdade?',
        answer:
          'Hoje o fluxo real implementado com mais profundidade e o do Instagram Business via Meta. As demais integracoes aparecem como catalogo e intencao de produto, mas ainda nao estao no mesmo nivel de operacao.',
      },
      {
        question: 'Como conectar o Instagram corretamente?',
        answer:
          'Selecione o perfil ativo, clique para conectar e conclua o fluxo de autorizacao da Meta. Depois disso, a conta passa a aparecer na lista de conexoes e pode ser sincronizada.',
      },
      {
        question: 'Conectar e sincronizar sao a mesma coisa?',
        answer:
          'Nao. Conectar significa autorizar a conta via Meta. Sincronizar significa buscar as metricas dessa conexao para abastecer o modulo de Performance.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configuracoes do Workspace',
    category: 'Administracao',
    status: 'Disponivel com escopo parcial',
    summary:
      'As Configuracoes do Workspace concentram visao de plano, uso mensal, equipe e acessos. Parte da experiencia ja orienta o usuario sobre cobranca e acesso por plano, enquanto outros controles ainda servem como camada operacional em evolucao.',
    keywords: ['configuracoes', 'workspace', 'plano', 'equipe', 'cobranca'],
    questions: [
      {
        question: 'O que eu consigo ajustar aqui hoje?',
        answer:
          'Hoje o modulo organiza a leitura do plano atual, uso mensal estimado e acesso de equipe. Ele tambem mostra quando uma funcionalidade depende de plano superior.',
      },
      {
        question: 'A parte de equipe depende do plano?',
        answer:
          'Sim. O proprio modulo verifica se o usuario tem acesso ao recurso de membros da equipe. Quando nao tem, exibe o estado bloqueado com orientacao de upgrade.',
      },
      {
        question: 'Todas as acoes desta tela ja alteram dados reais?',
        answer:
          'Nem todas. A tela mistura leitura real de permissao e contexto de plano com partes de experiencia que ainda estao sendo refinadas como gestao operacional completa do workspace.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Conta',
    category: 'Administracao',
    status: 'Disponivel com escopo parcial',
    summary:
      'O modulo de Conta mostra os dados basicos do usuario logado, como nome, email e perfil operacional capturado no onboarding. Ele ajuda a visualizar informacoes pessoais e preferencias da conta.',
    keywords: ['conta', 'perfil', 'usuario', 'email', 'seguranca'],
    questions: [
      {
        question: 'Quais dados da conta aparecem aqui?',
        answer:
          'O modulo exibe nome, email, website e o resumo do perfil operacional salvo no onboarding, incluindo modelo de trabalho, tamanho da operacao e processo atual.',
      },
      {
        question: 'As informacoes de onboarding aparecem novamente aqui?',
        answer:
          'Sim. A area de Perfil de Operacao reaproveita exatamente esse contexto para que o usuario consiga revisar como a conta foi configurada no inicio.',
      },
      {
        question: 'Todas as alteracoes da tela de conta ja estao com fluxo completo?',
        answer:
          'A tela ja organiza a experiencia de perfil e preferencias, mas parte do fluxo ainda esta mais orientada a visualizacao e refinamento progressivo do modulo.',
      },
    ],
  },
  {
    id: 'credits',
    title: 'Creditos e Cobranca',
    category: 'Financeiro',
    status: 'Disponivel com escopo parcial',
    summary:
      'O modulo de Creditos e Cobranca apresenta plano atual, saldo de creditos, planos disponiveis e compra via Stripe. O checkout e pensado para passar pelo Stripe e o webhook atualiza o plano do usuario apos o pagamento.',
    keywords: ['creditos', 'cobranca', 'stripe', 'plano', 'pagamento'],
    questions: [
      {
        question: 'Como os creditos funcionam no PostHub?',
        answer:
          'Os creditos representam a capacidade de uso de recursos pagos da plataforma, principalmente os ligados a IA e plano contratado. Cada plano oferece uma franquia mensal diferente.',
      },
      {
        question: 'Como a compra e feita?',
        answer:
          'A compra e direcionada para links de pagamento do Stripe. Depois que o pagamento e confirmado, o webhook da Stripe atualiza o plano do usuario dentro da plataforma.',
      },
      {
        question: 'O historico de cobranca ja e totalmente operacional?',
        answer:
          'O modulo ja comunica a logica de compra segura e plano atual, mas parte do historico exibido ainda funciona como apoio visual da experiencia de cobranca.',
      },
    ],
  },
];

const HIDDEN_HELP_ARTICLE_IDS = new Set<string>(HIDDEN_WORKSPACE_MODULE_IDS);
const VISIBLE_HELP_ARTICLES = HELP_ARTICLES.filter(
  (article) => !HIDDEN_HELP_ARTICLE_IDS.has(article.id)
);

const getStatusVariant = (status: HelpStatus) => {
  if (status === 'Disponivel agora') return 'success';
  if (status === 'Disponivel com escopo parcial') return 'warning';
  return 'default';
};

export const Support = () => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredArticles = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return VISIBLE_HELP_ARTICLES;

    return VISIBLE_HELP_ARTICLES.filter((article) => {
      const haystack = [
        article.title,
        article.category,
        article.summary,
        ...article.keywords,
        ...article.questions.flatMap((item) => [item.question, item.answer]),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchTerm]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-8">
      <div className="space-y-4 text-center">
        <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Help Center</h1>
        <p className="mx-auto max-w-3xl text-lg text-text-secondary">
          Aqui voce encontra a explicacao pratica de como cada modulo funciona hoje, com foco nas
          duvidas mais comuns do dia a dia.
        </p>

        <div className="mx-auto max-w-2xl pt-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Busque por modulo, processo ou duvida comum..."
            className="h-14 border-none text-lg shadow-lg ring-1 ring-gray-200"
            icon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-brand/20 bg-brand/[0.04]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Base por modulo</p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Cada bloco explica o papel real do modulo dentro da operacao.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-green-100 p-3 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Escopo atual</p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Os textos diferenciam o que ja esta operacional do que ainda esta em evolucao.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <MessageCircleMore className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Suporte direto</p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Se a explicacao nao resolver, cada artigo termina com acesso direto ao WhatsApp.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none bg-gray-900 p-8 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              <Sparkles className="h-3 w-3" />
              Duvidas comuns resolvidas
            </div>
            <h2 className="text-2xl font-bold">Central atualizada com a logica real do produto</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Os artigos abaixo foram organizados com base no funcionamento atual dos modulos dentro
              do PostHub para reduzir duvidas repetidas e orientar melhor o uso correto de cada area.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            {filteredArticles.length} modulo{filteredArticles.length === 1 ? '' : 's'} encontrado
            {filteredArticles.length === 1 ? '' : 's'}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold text-text-primary">Duvidas por modulo</h2>
        </div>

        {filteredArticles.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-base font-semibold text-text-primary">
              Nenhum artigo encontrado para essa busca.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Tente buscar pelo nome do modulo, como Calendario, Aprovacao, Roteiros ou Referencias.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="flex h-full flex-col p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      {article.category}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-text-primary">{article.title}</h3>
                  </div>
                  <Badge variant={getStatusVariant(article.status)}>{article.status}</Badge>
                </div>

                <p className="mt-4 text-sm leading-7 text-text-secondary">{article.summary}</p>

                <div className="mt-6 space-y-5">
                  {article.questions.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                      <h4 className="text-sm font-semibold text-text-primary">{item.question}</h4>
                      <p className="mt-2 text-sm leading-7 text-text-secondary">{item.answer}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-gray-100 pt-5">
                  <p className="text-sm text-text-secondary">
                    Se isso ainda nao resolveu sua duvida, fale comigo diretamente no WhatsApp.
                  </p>
                  <a
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/50'
                    )}
                  >
                    Falar no WhatsApp
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
