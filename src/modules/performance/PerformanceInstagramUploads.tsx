import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  FileText,
  FolderUp,
  Hash,
  ImagePlus,
  Instagram,
  LayoutGrid,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { Input } from '../../shared/components/Input';

type InstagramUploadJobStatus = 'processed';
type InstagramReviewStatus = 'pending_review' | 'approved' | 'needs_adjustment';

interface InstagramImportFile {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  uploadedAt: string;
}

interface InstagramImportedPost {
  id: string;
  title: string;
  postType: 'Reel' | 'Carrossel' | 'Feed' | 'Story';
  sourceFileId: string;
  sourceFileName: string;
  publishedAt: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  impressions: number;
  accountsEngaged: number;
  engagementRate: number;
  confidenceScore: number;
  reviewStatus: InstagramReviewStatus;
}

interface InstagramUploadJob {
  id: string;
  name: string;
  platform: 'instagram';
  createdAt: string;
  status: InstagramUploadJobStatus;
  files: InstagramImportFile[];
  posts: InstagramImportedPost[];
}

const STORAGE_KEY_PREFIX = 'posthub.performance.instagram-uploads';

const formatCompactNumber = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const buildStorageKey = (profileId: string) => `${STORAGE_KEY_PREFIX}:${profileId}`;

const createHash = (value: string) =>
  value.split('').reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

const deterministicNumber = (seed: string, min: number, max: number) => {
  const hash = createHash(seed);
  return min + (hash % (max - min + 1));
};

const inferPostType = (fileName: string): InstagramImportedPost['postType'] => {
  const normalized = fileName.toLowerCase();

  if (normalized.includes('story')) return 'Story';
  if (normalized.includes('carrossel') || normalized.includes('carousel')) return 'Carrossel';
  if (normalized.includes('reel')) return 'Reel';
  return 'Feed';
};

const buildPostTitle = (fileName: string, index: number) => {
  const cleanName = fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  if (!cleanName) {
    return `Post importado ${index + 1}`;
  }

  return `${cleanName} ${index > 0 ? `#${index + 1}` : ''}`.trim();
};

const getReviewBadgeVariant = (status: InstagramReviewStatus) => {
  switch (status) {
    case 'approved':
      return 'success' as const;
    case 'needs_adjustment':
      return 'warning' as const;
    default:
      return 'default' as const;
  }
};

const getReviewLabel = (status: InstagramReviewStatus) => {
  switch (status) {
    case 'approved':
      return 'Aprovado';
    case 'needs_adjustment':
      return 'Ajustar';
    default:
      return 'Revisar';
  }
};

const buildMockPosts = (file: File, fileId: string, batchSeed: string) => {
  const postCount = file.type === 'application/pdf' ? 3 : 1;
  const postType = inferPostType(file.name);

  return Array.from({ length: postCount }).map((_, index) => {
    const seed = `${batchSeed}:${file.name}:${index}`;
    const likes = deterministicNumber(seed, 210, 6200);
    const comments = deterministicNumber(`${seed}:comments`, 12, 460);
    const saves = deterministicNumber(`${seed}:saves`, 8, 950);
    const shares = deterministicNumber(`${seed}:shares`, 4, 720);
    const reach = deterministicNumber(`${seed}:reach`, 1800, 42000);
    const impressions = reach + deterministicNumber(`${seed}:impressions`, 300, 16000);
    const accountsEngaged = deterministicNumber(`${seed}:engaged`, 180, 3800);
    const totalInteractions = likes + comments + saves + shares;
    const engagementRate = Number(((totalInteractions / Math.max(reach, 1)) * 100).toFixed(1));
    const confidenceScore = Number(
      (deterministicNumber(`${seed}:confidence`, 82, 97) / 100).toFixed(2)
    );
    const dayOffset = deterministicNumber(`${seed}:date`, 1, 27);

    return {
      id: `ig-post-${seed.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
      title: buildPostTitle(file.name, index),
      postType,
      sourceFileId: fileId,
      sourceFileName: file.name,
      publishedAt: new Date(Date.now() - dayOffset * 86_400_000).toISOString(),
      likes,
      comments,
      saves,
      shares,
      reach,
      impressions,
      accountsEngaged,
      engagementRate,
      confidenceScore,
      reviewStatus: confidenceScore >= 0.9 ? 'approved' : 'pending_review',
    } satisfies InstagramImportedPost;
  });
};

const readStoredJobs = (profileId: string): InstagramUploadJob[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(buildStorageKey(profileId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as InstagramUploadJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistStoredJobs = (profileId: string, jobs: InstagramUploadJob[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(buildStorageKey(profileId), JSON.stringify(jobs));
};

export const PerformanceInstagramUploads = () => {
  const { activeProfile } = useProfile();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [jobs, setJobs] = React.useState<InstagramUploadJob[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [batchName, setBatchName] = React.useState('');
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    if (!activeProfile?.id) {
      setJobs([]);
      setSelectedJobId(null);
      return;
    }

    const storedJobs = readStoredJobs(activeProfile.id);
    setJobs(storedJobs);
    setSelectedJobId(storedJobs[0]?.id ?? null);
  }, [activeProfile?.id]);

  const persistJobs = React.useCallback(
    (nextJobs: InstagramUploadJob[]) => {
      setJobs(nextJobs);

      if (activeProfile?.id) {
        persistStoredJobs(activeProfile.id, nextJobs);
      }
    },
    [activeProfile?.id]
  );

  const handleSelectFiles = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    setSelectedFiles(nextFiles);
  }, []);

  const handleProcessFiles = React.useCallback(async () => {
    if (!selectedFiles.length) {
      return;
    }

    setIsProcessing(true);

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const batchSeed = `${Date.now()}`;
    const createdAt = new Date().toISOString();
    const files: InstagramImportFile[] = selectedFiles.map((file, index) => ({
      id: `ig-file-${batchSeed}-${index}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      sizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
      uploadedAt: createdAt,
    }));

    const posts = files.flatMap((file, index) =>
      buildMockPosts(selectedFiles[index], file.id, `${batchSeed}:${index}`)
    );

    const newJob: InstagramUploadJob = {
      id: `ig-job-${batchSeed}`,
      name: batchName.trim() || `Importação Instagram ${jobs.length + 1}`,
      platform: 'instagram',
      createdAt,
      status: 'processed',
      files,
      posts,
    };

    const nextJobs = [newJob, ...jobs];
    persistJobs(nextJobs);
    setSelectedJobId(newJob.id);
    setSelectedFiles([]);
    setBatchName('');
    setIsProcessing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [batchName, jobs, persistJobs, selectedFiles]);

  const handleUpdateReviewStatus = React.useCallback(
    (jobId: string, postId: string, reviewStatus: InstagramReviewStatus) => {
      const nextJobs = jobs.map((job) =>
        job.id !== jobId
          ? job
          : {
              ...job,
              posts: job.posts.map((post) =>
                post.id === postId ? { ...post, reviewStatus } : post
              ),
            }
      );

      persistJobs(nextJobs);
    },
    [jobs, persistJobs]
  );

  const handleDeleteJob = React.useCallback(
    (jobId: string) => {
      const nextJobs = jobs.filter((job) => job.id !== jobId);
      persistJobs(nextJobs);
      setSelectedJobId((current) => {
        if (current !== jobId) return current;
        return nextJobs[0]?.id ?? null;
      });
    },
    [jobs, persistJobs]
  );

  const allPosts = React.useMemo(() => jobs.flatMap((job) => job.posts), [jobs]);
  const selectedJob = React.useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId]
  );

  const approvedPosts = React.useMemo(
    () => allPosts.filter((post) => post.reviewStatus === 'approved'),
    [allPosts]
  );

  const dashboardSummary = React.useMemo(() => {
    const sumBy = (items: InstagramImportedPost[], getter: (post: InstagramImportedPost) => number) =>
      items.reduce((acc, item) => acc + getter(item), 0);

    const safeBase = approvedPosts.length > 0 ? approvedPosts : allPosts;
    const totalReach = sumBy(safeBase, (post) => post.reach);
    const totalImpressions = sumBy(safeBase, (post) => post.impressions);
    const totalEngaged = sumBy(safeBase, (post) => post.accountsEngaged);
    const avgEngagementRate = safeBase.length
      ? safeBase.reduce((acc, post) => acc + post.engagementRate, 0) / safeBase.length
      : 0;

    return {
      imports: jobs.length,
      files: jobs.reduce((acc, job) => acc + job.files.length, 0),
      posts: safeBase.length,
      totalReach,
      totalImpressions,
      totalEngaged,
      avgEngagementRate,
    };
  }, [allPosts, approvedPosts, jobs]);

  const topPosts = React.useMemo(
    () =>
      [...(approvedPosts.length ? approvedPosts : allPosts)]
        .sort((a, b) => b.reach - a.reach)
        .slice(0, 5),
    [allPosts, approvedPosts]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="brand">Instagram</Badge>
            <Badge variant="info">Primeira versão</Badge>
            <Badge variant="warning">Protótipo com extração simulada</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text-primary">Dashboard por uploads do Instagram</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            Esta versão valida o fluxo da nova página: upload de imagens e PDFs, criação de um lote,
            revisão dos posts detectados e geração do dashboard específico da plataforma. A próxima
            etapa conecta IA real, storage e banco dedicado.
          </p>
          {activeProfile && (
            <p className="mt-2 text-sm text-text-secondary">
              Perfil ativo: <span className="font-medium text-text-primary">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleSelectFiles}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Selecionar arquivos
          </Button>
          <Button
            className="gap-2"
            onClick={() => void handleProcessFiles()}
            disabled={!selectedFiles.length}
            isLoading={isProcessing}
          >
            <Sparkles className="h-4 w-4" />
            Processar importação
          </Button>
        </div>
      </div>

      <Card className="border-brand/15 bg-brand/[0.04]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <CardTitle>Preparar novo lote</CardTitle>
              <CardDescription>
                Envie prints ou PDFs de métricas do Instagram. Nesta primeira versão, a extração é
                simulada para validar a experiência da página.
              </CardDescription>
            </div>

            <Input
              label="Nome do lote"
              placeholder="Ex.: Março 2026 - Reels de performance"
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
            />

            <div className="rounded-2xl border border-dashed border-brand/30 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <FolderUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">
                    Arraste arquivos ou selecione manualmente
                  </p>
                  <p className="text-sm text-text-secondary">
                    Tipos aceitos nesta versão: imagem e PDF
                  </p>
                </div>
              </div>

              {selectedFiles.length ? (
                <div className="space-y-3">
                  {selectedFiles.map((file) => {
                    const isPdf = file.type === 'application/pdf';

                    return (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-text-secondary">
                            {isPdf ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{file.name}</p>
                            <p className="text-xs text-text-secondary">
                              {isPdf ? 'PDF' : 'Imagem'} • {Number(file.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                        <Badge variant="default">Pronto</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum arquivo selecionado"
                  description="Use a seleção de arquivos para montar um lote e ver o dashboard de preview."
                  icon={Instagram}
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-gray-200 bg-white">
              <CardTitle className="mb-3">Como essa página deve evoluir</CardTitle>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex gap-3">
                  <Hash className="mt-0.5 h-4 w-4 text-brand" />
                  <p>Upload vai para storage dedicado do Instagram.</p>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-brand" />
                  <p>IA extrai métricas por post e devolve JSON estruturado.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                  <p>Usuário revisa antes de consolidar no dashboard final.</p>
                </div>
                <div className="flex gap-3">
                  <LayoutGrid className="mt-0.5 h-4 w-4 text-brand" />
                  <p>A página do Instagram usa tabelas próprias, sem misturar com TikTok e YouTube.</p>
                </div>
              </div>
            </Card>

            <Card className="border-gray-200 bg-white">
              <CardTitle className="mb-3">Próximas integrações</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand">Storage</Badge>
                <Badge variant="brand">Edge Function</Badge>
                <Badge variant="brand">IA multimodal</Badge>
                <Badge variant="brand">Tabela dedicada</Badge>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <p className="mb-1 text-sm text-text-secondary">Importações</p>
          <h3 className="text-2xl font-bold text-text-primary">{dashboardSummary.imports}</h3>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-text-secondary">Arquivos processados</p>
          <h3 className="text-2xl font-bold text-text-primary">{dashboardSummary.files}</h3>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-text-secondary">Posts no dashboard</p>
          <h3 className="text-2xl font-bold text-text-primary">{dashboardSummary.posts}</h3>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-text-secondary">Alcance consolidado</p>
          <h3 className="text-2xl font-bold text-text-primary">
            {formatCompactNumber(dashboardSummary.totalReach)}
          </h3>
        </Card>
        <Card>
          <p className="mb-1 text-sm text-text-secondary">Engajamento médio</p>
          <h3 className="text-2xl font-bold text-text-primary">
            {formatPercent(dashboardSummary.avgEngagementRate)}
          </h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>Lotes importados</CardTitle>
              <CardDescription>
                Cada lote representa uma futura importação real para a tabela do Instagram.
              </CardDescription>
            </div>
            <Badge variant="brand">{jobs.length} lote(s)</Badge>
          </div>

          {!jobs.length ? (
            <EmptyState
              title="Nenhuma importação criada"
              description="Selecione arquivos e processe um lote para visualizar o dashboard desta nova página."
              icon={Instagram}
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isActive = selectedJob?.id === job.id;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-brand bg-brand/[0.05] shadow-sm'
                        : 'border-gray-200 bg-white hover:border-brand/30 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary">{job.name}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="success">Processado</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span>{job.files.length} arquivo(s)</span>
                      <span>{job.posts.length} post(s)</span>
                      <span>{job.platform}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>Dashboard consolidado do Instagram</CardTitle>
              <CardDescription>
                A prévia abaixo já simula como a página final vai responder às métricas da plataforma.
              </CardDescription>
            </div>
            <Badge variant="brand">
              {approvedPosts.length ? 'Apenas aprovados' : 'Usando todos os posts'}
            </Badge>
          </div>

          {!topPosts.length ? (
            <EmptyState
              title="Sem posts para consolidar"
              description="Depois que um lote for processado, o dashboard específico do Instagram aparece aqui."
              icon={LayoutGrid}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-text-secondary">Impressões</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {formatCompactNumber(dashboardSummary.totalImpressions)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-text-secondary">Contas engajadas</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {formatCompactNumber(dashboardSummary.totalEngaged)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-text-secondary">Posts aprovados</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">{approvedPosts.length}</p>
                </div>
              </div>

              <div className="space-y-3">
                {topPosts.map((post, index) => {
                  const width = Math.max(18, Math.round((post.reach / topPosts[0].reach) * 100));

                  return (
                    <div key={post.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-primary">{post.title}</p>
                          <p className="text-xs text-text-secondary">
                            {post.postType} • {new Date(post.publishedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getReviewBadgeVariant(post.reviewStatus)}>
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="mb-2 h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-brand"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
                        <span>Alcance: {formatCompactNumber(post.reach)}</span>
                        <span>Impressões: {formatCompactNumber(post.impressions)}</span>
                        <span>ER: {formatPercent(post.engagementRate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Posts extraídos do lote</CardTitle>
            <CardDescription>
              Esta é a tabela que depois será salva em uma estrutura dedicada, como
              `performance_posts_instagram`.
            </CardDescription>
          </div>

          {selectedJob && (
            <Button
              variant="ghost"
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleDeleteJob(selectedJob.id)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir lote
            </Button>
          )}
        </div>

        {!selectedJob ? (
          <EmptyState
            title="Selecione um lote"
            description="Os posts detectados pela importação aparecem aqui para revisão e aprovação."
            icon={FileText}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-text-secondary">
                  <th className="pb-4 font-medium">Post</th>
                  <th className="pb-4 font-medium">Arquivo</th>
                  <th className="pb-4 font-medium">Métricas</th>
                  <th className="pb-4 font-medium">Confiança</th>
                  <th className="pb-4 font-medium">Revisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {selectedJob.posts.map((post) => (
                  <tr key={post.id} className="align-top">
                    <td className="py-4">
                      <div>
                        <p className="font-medium text-text-primary">{post.title}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {post.postType} • {new Date(post.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="max-w-[220px]">
                        <p className="truncate text-text-primary">{post.sourceFileName}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          ID arquivo: {post.sourceFileId}
                        </p>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
                        <span>Curtidas: {formatCompactNumber(post.likes)}</span>
                        <span>Comentários: {formatCompactNumber(post.comments)}</span>
                        <span>Salvos: {formatCompactNumber(post.saves)}</span>
                        <span>Compart.: {formatCompactNumber(post.shares)}</span>
                        <span>Alcance: {formatCompactNumber(post.reach)}</span>
                        <span>ER: {formatPercent(post.engagementRate)}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-2">
                        <Badge variant={post.confidenceScore >= 0.9 ? 'success' : 'warning'}>
                          {Math.round(post.confidenceScore * 100)}%
                        </Badge>
                        <p className="text-xs text-text-secondary">
                          {post.confidenceScore >= 0.9
                            ? 'Extração consistente'
                            : 'Precisa revisão humana'}
                        </p>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-2">
                        <Badge variant={getReviewBadgeVariant(post.reviewStatus)}>
                          {getReviewLabel(post.reviewStatus)}
                        </Badge>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={post.reviewStatus === 'approved' ? 'primary' : 'outline'}
                            onClick={() =>
                              handleUpdateReviewStatus(selectedJob.id, post.id, 'approved')
                            }
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              post.reviewStatus === 'needs_adjustment' ? 'secondary' : 'ghost'
                            }
                            onClick={() =>
                              handleUpdateReviewStatus(
                                selectedJob.id,
                                post.id,
                                'needs_adjustment'
                              )
                            }
                          >
                            Ajustar
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-700" />
          <div>
            <CardTitle className="text-yellow-900">O que esta primeira versão resolve</CardTitle>
            <p className="mt-2 text-sm leading-6 text-yellow-800">
              Ela já valida a nova IA de produto: cada rede social terá sua própria página, seu
              próprio dashboard e sua própria tabela. Aqui, o fluxo do Instagram já está desenhado na
              interface e pronto para receber backend real no próximo passo.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
