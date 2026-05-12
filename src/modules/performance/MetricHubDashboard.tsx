import * as React from 'react';
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clapperboard,
  FileImage,
  FileText,
  FolderUp,
  Hash,
  ImagePlus,
  Instagram,
  LayoutGrid,
  Sparkles,
  Trash2,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { Input } from '../../shared/components/Input';
import { Tabs } from '../../shared/components/Tabs';
import { cn } from '../../shared/utils/cn';
import { useIsMobile } from '../mobile/hooks/useIsMobile';

type MetricPlatform = 'instagram' | 'tiktok' | 'youtube';
type MetricUploadJobStatus = 'processed';
type MetricReviewStatus = 'pending_review' | 'approved' | 'needs_adjustment';

interface MetricImportFile {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  uploadedAt: string;
}

interface MetricImportedEntry {
  id: string;
  title: string;
  contentType: string;
  sourceFileId: string;
  sourceFileName: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  confidenceScore: number;
  reviewStatus: MetricReviewStatus;
}

interface MetricUploadJob {
  id: string;
  name: string;
  platform: MetricPlatform;
  createdAt: string;
  status: MetricUploadJobStatus;
  files: MetricImportFile[];
  entries: MetricImportedEntry[];
}

interface PlatformDefinition {
  id: MetricPlatform;
  label: string;
  icon: LucideIcon;
  heroLabel: string;
  primaryMetricLabel: string;
  summaryLabel: string;
  batchPlaceholder: string;
  helperText: string;
  accentClassName: string;
  softClassName: string;
  contentTypes: string[];
}

const PLATFORM_DEFINITIONS: Record<MetricPlatform, PlatformDefinition> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    heroLabel: 'reels, carrosseis e stories',
    primaryMetricLabel: 'Alcance',
    summaryLabel: 'engajamentos',
    batchPlaceholder: 'Ex.: Abril 2026 - collabs e reels',
    helperText: 'Perfeito para creators e social medias que vivem de prints no direct.',
    accentClassName: 'text-[#D946EF]',
    softClassName: 'border-[#F3D8FA] bg-[#FFF5FD]',
    contentTypes: ['Reel', 'Carrossel', 'Feed', 'Story'],
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    icon: Clapperboard,
    heroLabel: 'videos curtos e series',
    primaryMetricLabel: 'Visualizacoes',
    summaryLabel: 'interacoes',
    batchPlaceholder: 'Ex.: Maio 2026 - virais e UGC',
    helperText: 'Organize resultados sem precisar montar uma planilha a cada print novo.',
    accentClassName: 'text-[#0F172A]',
    softClassName: 'border-[#DDE7F3] bg-[#F7FAFC]',
    contentTypes: ['Video', 'Serie', 'Live', 'Trend'],
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    heroLabel: 'shorts e videos longos',
    primaryMetricLabel: 'Views',
    summaryLabel: 'historico',
    batchPlaceholder: 'Ex.: Junho 2026 - shorts e cortes',
    helperText: 'Junte shorts, videos longos e cortes em uma mesma linha do tempo.',
    accentClassName: 'text-[#DC2626]',
    softClassName: 'border-[#F6D5D9] bg-[#FFF7F8]',
    contentTypes: ['Short', 'Video', 'Corte', 'Live'],
  },
};

const STORAGE_KEY_PREFIX = 'posthub.metric-hub.uploads';

const formatCompactNumber = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const buildStorageKey = (profileId: string, platform: MetricPlatform) =>
  `${STORAGE_KEY_PREFIX}:${profileId}:${platform}`;

const createHash = (value: string) =>
  value.split('').reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

const deterministicNumber = (seed: string, min: number, max: number) => {
  const hash = createHash(seed);
  return min + (hash % (max - min + 1));
};

const buildEntryTitle = (fileName: string, index: number) => {
  const cleanName = fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  if (!cleanName) {
    return `Entrada ${index + 1}`;
  }

  return `${cleanName} ${index > 0 ? `#${index + 1}` : ''}`.trim();
};

const buildContentType = (platform: MetricPlatform, fileName: string, index: number) => {
  const definition = PLATFORM_DEFINITIONS[platform];
  const normalized = fileName.toLowerCase();

  const matchedType = definition.contentTypes.find((contentType) =>
    normalized.includes(contentType.toLowerCase())
  );

  if (matchedType) {
    return matchedType;
  }

  return definition.contentTypes[index % definition.contentTypes.length];
};

const getReviewBadgeVariant = (status: MetricReviewStatus) => {
  switch (status) {
    case 'approved':
      return 'success' as const;
    case 'needs_adjustment':
      return 'warning' as const;
    default:
      return 'default' as const;
  }
};

const getReviewLabel = (status: MetricReviewStatus) => {
  switch (status) {
    case 'approved':
      return 'Aprovado';
    case 'needs_adjustment':
      return 'Ajustar';
    default:
      return 'Revisar';
  }
};

const buildMockEntries = (
  platform: MetricPlatform,
  file: File,
  fileId: string,
  batchSeed: string
) => {
  const itemCount = file.type === 'application/pdf' ? 2 : 1;

  return Array.from({ length: itemCount }).map((_, index) => {
    const seed = `${platform}:${batchSeed}:${file.name}:${index}`;
    const views = deterministicNumber(`${seed}:views`, 1_100, 185_000);
    const likes = deterministicNumber(`${seed}:likes`, 70, 18_000);
    const comments = deterministicNumber(`${seed}:comments`, 8, 1_700);
    const shares = deterministicNumber(`${seed}:shares`, 4, 6_400);
    const saves = deterministicNumber(`${seed}:saves`, 12, 4_200);
    const interactions = likes + comments + shares + saves;
    const engagementRate = Number(((interactions / Math.max(views, 1)) * 100).toFixed(1));
    const confidenceScore = Number(
      (deterministicNumber(`${seed}:confidence`, 84, 98) / 100).toFixed(2)
    );
    const dayOffset = deterministicNumber(`${seed}:date`, 1, 32);

    return {
      id: `metric-entry-${seed.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
      title: buildEntryTitle(file.name, index),
      contentType: buildContentType(platform, file.name, index),
      sourceFileId: fileId,
      sourceFileName: file.name,
      publishedAt: new Date(Date.now() - dayOffset * 86_400_000).toISOString(),
      views,
      likes,
      comments,
      shares,
      saves,
      engagementRate,
      confidenceScore,
      reviewStatus: confidenceScore >= 0.92 ? 'approved' : 'pending_review',
    } satisfies MetricImportedEntry;
  });
};

const readStoredJobs = (profileId: string, platform: MetricPlatform): MetricUploadJob[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(buildStorageKey(profileId, platform));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as MetricUploadJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistStoredJobs = (
  profileId: string,
  platform: MetricPlatform,
  jobs: MetricUploadJob[]
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(buildStorageKey(profileId, platform), JSON.stringify(jobs));
};

export const MetricHubDashboard = () => {
  const isMobile = useIsMobile();
  const { activeProfile } = useProfile();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [platform, setPlatform] = React.useState<MetricPlatform>('instagram');
  const [jobs, setJobs] = React.useState<MetricUploadJob[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [batchName, setBatchName] = React.useState('');
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const platformDefinition = PLATFORM_DEFINITIONS[platform];
  const PlatformIcon = platformDefinition.icon;

  React.useEffect(() => {
    if (!activeProfile?.id) {
      setJobs([]);
      setSelectedJobId(null);
      return;
    }

    const storedJobs = readStoredJobs(activeProfile.id, platform);
    setJobs(storedJobs);
    setSelectedJobId(storedJobs[0]?.id ?? null);
  }, [activeProfile?.id, platform]);

  React.useEffect(() => {
    setSelectedFiles([]);
    setBatchName('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [platform]);

  const persistJobs = React.useCallback(
    (nextJobs: MetricUploadJob[]) => {
      setJobs(nextJobs);

      if (activeProfile?.id) {
        persistStoredJobs(activeProfile.id, platform, nextJobs);
      }
    },
    [activeProfile?.id, platform]
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

    await new Promise((resolve) => window.setTimeout(resolve, 750));

    const batchSeed = `${Date.now()}`;
    const createdAt = new Date().toISOString();
    const files: MetricImportFile[] = selectedFiles.map((file, index) => ({
      id: `metric-file-${batchSeed}-${index}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      sizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
      uploadedAt: createdAt,
    }));

    const entries = files.flatMap((file, index) =>
      buildMockEntries(platform, selectedFiles[index], file.id, `${batchSeed}:${index}`)
    );

    const newJob: MetricUploadJob = {
      id: `metric-job-${platform}-${batchSeed}`,
      name: batchName.trim() || `${platformDefinition.label} ${jobs.length + 1}`,
      platform,
      createdAt,
      status: 'processed',
      files,
      entries,
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
  }, [batchName, jobs, persistJobs, platform, platformDefinition.label, selectedFiles]);

  const handleUpdateReviewStatus = React.useCallback(
    (jobId: string, entryId: string, reviewStatus: MetricReviewStatus) => {
      const nextJobs = jobs.map((job) =>
        job.id !== jobId
          ? job
          : {
              ...job,
              entries: job.entries.map((entry) =>
                entry.id === entryId ? { ...entry, reviewStatus } : entry
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

  const allEntries = React.useMemo(() => jobs.flatMap((job) => job.entries), [jobs]);
  const selectedJob = React.useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId]
  );
  const approvedEntries = React.useMemo(
    () => allEntries.filter((entry) => entry.reviewStatus === 'approved'),
    [allEntries]
  );

  const dashboardSummary = React.useMemo(() => {
    const safeBase = approvedEntries.length > 0 ? approvedEntries : allEntries;
    const totalViews = safeBase.reduce((acc, entry) => acc + entry.views, 0);
    const totalLikes = safeBase.reduce((acc, entry) => acc + entry.likes, 0);
    const totalComments = safeBase.reduce((acc, entry) => acc + entry.comments, 0);
    const totalShares = safeBase.reduce((acc, entry) => acc + entry.shares, 0);
    const avgEngagementRate = safeBase.length
      ? safeBase.reduce((acc, entry) => acc + entry.engagementRate, 0) / safeBase.length
      : 0;

    return {
      imports: jobs.length,
      files: jobs.reduce((acc, job) => acc + job.files.length, 0),
      entries: safeBase.length,
      totalViews,
      totalInteractions: totalLikes + totalComments + totalShares,
      avgEngagementRate,
    };
  }, [allEntries, approvedEntries, jobs]);

  const topEntries = React.useMemo(
    () =>
      [...(approvedEntries.length ? approvedEntries : allEntries)]
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
    [allEntries, approvedEntries]
  );

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">MetricHub</Badge>
          <Badge variant="info">Mobile-first</Badge>
          <Badge variant="success">Historico por plataforma</Badge>
        </div>

        <div className="rounded-[30px] border border-[#D8E8F5] bg-[linear-gradient(180deg,#FFFFFF_0%,#F5FAFD_100%)] p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm',
                    platformDefinition.softClassName
                  )}
                >
                  <PlatformIcon className={cn('h-5 w-5', platformDefinition.accentClassName)} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                    Painel mobile
                  </p>
                  <h2 className="text-xl font-semibold text-text-primary">
                    Historico de metricas do {platformDefinition.label}
                  </h2>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                Suba prints ou PDFs de {platformDefinition.heroLabel}, revise as entradas do lote e
                mantenha um historico proprio por perfil.
              </p>

              {activeProfile ? (
                <p className="mt-3 text-sm text-text-secondary">
                  Perfil ativo:{' '}
                  <span className="font-medium text-text-primary">{activeProfile.name}</span>
                </p>
              ) : null}
            </div>

            <div className="hidden rounded-3xl border border-[#D8E8F5] bg-white px-4 py-3 text-right sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Resumo rapido
              </p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {formatCompactNumber(dashboardSummary.totalViews)}
              </p>
              <p className="text-xs text-text-secondary">{platformDefinition.primaryMetricLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={Object.values(PLATFORM_DEFINITIONS).map((item) => ({
          id: item.id,
          label: item.label,
          icon: <item.icon className="h-4 w-4" />,
        }))}
        activeTab={platform}
        onChange={(nextTab) => setPlatform(nextTab as MetricPlatform)}
        className="rounded-[22px] border border-slate-200 bg-white px-2 py-2"
      />

      <Card className="rounded-[30px] border-[#D8E8F5] bg-[linear-gradient(180deg,#F9FCFE_0%,#FFFFFF_100%)] p-0">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <CardTitle>Montar novo lote</CardTitle>
              <CardDescription>
                Envie prints do celular e deixe cada importacao organizada por periodo, campanha ou
                cliente.
              </CardDescription>
            </div>

            <Input
              label="Nome do lote"
              placeholder={platformDefinition.batchPlaceholder}
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
            />

            <div className="rounded-[26px] border border-dashed border-brand/30 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <FolderUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Subir prints do celular</p>
                  <p className="text-sm text-text-secondary">Arquivos aceitos: imagem e PDF</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleSelectFiles}
              />

              {selectedFiles.length ? (
                <div className="space-y-3">
                  {selectedFiles.map((file) => {
                    const isPdf = file.type === 'application/pdf';

                    return (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-text-secondary">
                            {isPdf ? (
                              <FileText className="h-5 w-5" />
                            ) : (
                              <FileImage className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-primary">{file.name}</p>
                            <p className="text-xs text-text-secondary">
                              {isPdf ? 'PDF' : 'Imagem'} •{' '}
                              {Number(file.size / (1024 * 1024)).toFixed(1)} MB
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
                  description="Escolha os prints da plataforma para formar um lote e consolidar o historico."
                  icon={PlatformIcon}
                  className="px-0 py-8"
                />
              )}
            </div>

            {!isMobile ? (
              <div className="flex flex-wrap gap-3">
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
                  Processar lote
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card className="rounded-[26px] border-slate-200 bg-white">
              <CardTitle className="mb-3 text-base">Fluxo pensado para polegar</CardTitle>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex gap-3">
                  <Hash className="mt-0.5 h-4 w-4 text-brand" />
                  <p>Separe lotes por semana, cliente ou formato sem sair do celular.</p>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-brand" />
                  <p>Consolide a leitura do periodo mesmo quando os dados chegaram por print.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                  <p>Aprove ou ajuste cada entrada antes de considerar o historico fechado.</p>
                </div>
                <div className="flex gap-3">
                  <LayoutGrid className="mt-0.5 h-4 w-4 text-brand" />
                  <p>{platformDefinition.helperText}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[26px] border-slate-200 bg-white">
              <CardTitle className="mb-3 text-base">O que fica salvo</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand">{platformDefinition.primaryMetricLabel}</Badge>
                <Badge variant="brand">Curtidas</Badge>
                <Badge variant="brand">Comentarios</Badge>
                <Badge variant="brand">Compartilhamentos</Badge>
                <Badge variant="brand">Taxa de engajamento</Badge>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Importacoes',
            value: dashboardSummary.imports,
            detail: `${dashboardSummary.files} arquivo(s)`,
          },
          {
            label: platformDefinition.primaryMetricLabel,
            value: formatCompactNumber(dashboardSummary.totalViews),
            detail: platformDefinition.label,
          },
          {
            label: platformDefinition.summaryLabel,
            value: formatCompactNumber(dashboardSummary.totalInteractions),
            detail: `${dashboardSummary.entries} entrada(s)`,
          },
          {
            label: 'ER medio',
            value: formatPercent(dashboardSummary.avgEngagementRate),
            detail: approvedEntries.length ? 'apenas aprovados' : 'base completa',
          },
        ].map((item) => (
          <Card key={item.label} className="rounded-[24px] border-slate-200 bg-white">
            <p className="text-sm text-text-secondary">{item.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h3 className="text-2xl font-semibold text-text-primary">{item.value}</h3>
              <ArrowUpRight className="h-4 w-4 text-brand" />
            </div>
            <p className="mt-2 text-xs text-text-secondary">{item.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[30px] border-slate-200 bg-white">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>Lotes do {platformDefinition.label}</CardTitle>
              <CardDescription>Toque em um lote para abrir o historico detalhado.</CardDescription>
            </div>
            <Badge variant="brand">{jobs.length} lote(s)</Badge>
          </div>

          {!jobs.length ? (
            <EmptyState
              title="Ainda nao ha lotes"
              description="Suba os primeiros prints para iniciar um historico proprio dessa plataforma."
              icon={PlatformIcon}
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
                    className={cn(
                      'w-full rounded-[24px] border p-4 text-left transition-all',
                      isActive
                        ? 'border-brand bg-brand/[0.05] shadow-sm'
                        : 'border-slate-200 bg-slate-50/60 hover:border-brand/30 hover:bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text-primary">{job.name}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="success">Processado</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span>{job.files.length} arquivo(s)</span>
                      <span>{job.entries.length} entrada(s)</span>
                      <span>{platformDefinition.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="rounded-[30px] border-slate-200 bg-white">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <CardTitle>Resumo consolidado</CardTitle>
              <CardDescription>
                Ranking mobile dos itens com melhor desempenho dentro do historico salvo.
              </CardDescription>
            </div>
            <Badge variant="brand">
              {approvedEntries.length ? 'Base revisada' : 'Base completa'}
            </Badge>
          </div>

          {!topEntries.length ? (
            <EmptyState
              title="Sem entradas para resumir"
              description="As entradas processadas vao aparecer aqui assim que o primeiro lote for concluido."
              icon={BarChart3}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm text-text-secondary">Curtidas</p>
                  <p className="mt-1 text-2xl font-semibold text-text-primary">
                    {formatCompactNumber(
                      (approvedEntries.length ? approvedEntries : allEntries).reduce(
                        (acc, entry) => acc + entry.likes,
                        0
                      )
                    )}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm text-text-secondary">Comentarios</p>
                  <p className="mt-1 text-2xl font-semibold text-text-primary">
                    {formatCompactNumber(
                      (approvedEntries.length ? approvedEntries : allEntries).reduce(
                        (acc, entry) => acc + entry.comments,
                        0
                      )
                    )}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm text-text-secondary">Compartilhamentos</p>
                  <p className="mt-1 text-2xl font-semibold text-text-primary">
                    {formatCompactNumber(
                      (approvedEntries.length ? approvedEntries : allEntries).reduce(
                        (acc, entry) => acc + entry.shares,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {topEntries.map((entry, index) => {
                  const width = Math.max(20, Math.round((entry.views / topEntries[0].views) * 100));

                  return (
                    <div key={entry.id} className="rounded-[24px] border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text-primary">{entry.title}</p>
                          <p className="text-xs text-text-secondary">
                            {entry.contentType} •{' '}
                            {new Date(entry.publishedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getReviewBadgeVariant(entry.reviewStatus)}>
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="mb-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-brand" style={{ width: `${width}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
                        <span>{platformDefinition.primaryMetricLabel}: {formatCompactNumber(entry.views)}</span>
                        <span>ER: {formatPercent(entry.engagementRate)}</span>
                        <span>Salvos: {formatCompactNumber(entry.saves)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-[30px] border-slate-200 bg-white">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Entradas do lote</CardTitle>
            <CardDescription>
              Revise cada item detectado antes de fechar o historico do periodo.
            </CardDescription>
          </div>

          {selectedJob ? (
            <Button
              variant="ghost"
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleDeleteJob(selectedJob.id)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir lote
            </Button>
          ) : null}
        </div>

        {!selectedJob ? (
          <EmptyState
            title="Escolha um lote"
            description="As entradas processadas aparecem aqui para aprovacao e ajuste."
            icon={FileText}
          />
        ) : (
          <div className="space-y-3">
            {selectedJob.entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50/55 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary">{entry.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {entry.contentType} • {new Date(entry.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getReviewBadgeVariant(entry.reviewStatus)}>
                    {getReviewLabel(entry.reviewStatus)}
                  </Badge>
                </div>

                <div className="mt-4 rounded-[22px] bg-white px-4 py-3">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {entry.sourceFileName}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">Origem: {entry.sourceFileId}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: platformDefinition.primaryMetricLabel, value: formatCompactNumber(entry.views) },
                    { label: 'Curtidas', value: formatCompactNumber(entry.likes) },
                    { label: 'Comentarios', value: formatCompactNumber(entry.comments) },
                    { label: 'ER', value: formatPercent(entry.engagementRate) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] bg-white px-3 py-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                        {item.label}
                      </p>
                      <p className="mt-1 font-semibold text-text-primary">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-text-secondary sm:flex sm:flex-wrap">
                  <span>Compart.: {formatCompactNumber(entry.shares)}</span>
                  <span>Salvos: {formatCompactNumber(entry.saves)}</span>
                  <span>Confianca: {Math.round(entry.confidenceScore * 100)}%</span>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    variant={entry.reviewStatus === 'approved' ? 'primary' : 'outline'}
                    onClick={() =>
                      handleUpdateReviewStatus(selectedJob.id, entry.id, 'approved')
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant={entry.reviewStatus === 'needs_adjustment' ? 'secondary' : 'ghost'}
                    onClick={() =>
                      handleUpdateReviewStatus(selectedJob.id, entry.id, 'needs_adjustment')
                    }
                  >
                    Ajustar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isMobile ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-4 pb-4 pt-3 backdrop-blur-xl"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="mx-auto flex max-w-6xl gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Escolher
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => void handleProcessFiles()}
              disabled={!selectedFiles.length}
              isLoading={isProcessing}
            >
              <Sparkles className="h-4 w-4" />
              Processar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
