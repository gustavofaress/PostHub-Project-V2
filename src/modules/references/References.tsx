import * as React from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  ExternalLink,
  Copy,
  MoreVertical,
  Tag,
  Folder,
  Trash2,
  Pencil,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Eye,
  Upload,
  PlayCircle,
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';

type ReferenceType = 'link' | 'image' | 'video' | 'screen_recording';

interface ReferenceItem {
  id: string;
  profileId: string;
  title: string;
  description: string;
  type: ReferenceType;
  source: string;
  sourceUrl?: string;
  thumbnail: string;
  tags: string[];
  folder?: string;
  campaign?: string;
  platform?: string;
  format?: string;
  notes?: string;
  createdAt: string;
  fileName?: string;
  fileSizeMb?: number;
}

const ACTIVE_PROFILE_ID = 'profile-acme-demo';

const INITIAL_REFERENCES: ReferenceItem[] = [
  {
    id: '1',
    profileId: 'profile-acme-demo',
    title: 'Hook visual para imóvel alto padrão',
    description:
      'Abertura rápida mostrando fachada + texto forte. Boa referência para vídeos imobiliários com foco em autoridade.',
    type: 'video',
    source: 'Instagram',
    sourceUrl: 'https://instagram.com/',
    thumbnail: 'https://picsum.photos/seed/ref1/600/600',
    tags: ['hook', 'imobiliário', 'autoridade'],
    folder: 'Reels',
    campaign: 'Captação Premium',
    platform: 'Instagram',
    format: 'Reel',
    notes: 'Pode adaptar para abertura com drone + corte rápido.',
    createdAt: '2026-04-04',
    fileName: 'fachada-premium.mp4',
    fileSizeMb: 84,
  },
  {
    id: '2',
    profileId: 'profile-acme-demo',
    title: 'Carrossel com estrutura de storytelling',
    description:
      'Boa lógica de construção para carrossel educativo com CTA final. Ideal para adaptar em conteúdo B2B.',
    type: 'link',
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com/',
    thumbnail: 'https://picsum.photos/seed/ref2/600/600',
    tags: ['carrossel', 'storytelling', 'b2b'],
    folder: 'Carrosséis',
    campaign: 'Conteúdo de Autoridade',
    platform: 'LinkedIn',
    format: 'Carousel',
    notes: 'Estrutura boa de dor > contexto > prova > CTA.',
    createdAt: '2026-04-03',
  },
  {
    id: '3',
    profileId: 'profile-acme-demo',
    title: 'Estética clean para social de marca premium',
    description:
      'Referência visual de composição, iluminação e paleta. Útil para peças de branding com sensação premium.',
    type: 'image',
    source: 'Pinterest',
    sourceUrl: 'https://pinterest.com/',
    thumbnail: 'https://picsum.photos/seed/ref3/600/600',
    tags: ['branding', 'estética', 'premium'],
    folder: 'Branding',
    campaign: 'Reposicionamento',
    platform: 'Pinterest',
    format: 'Image',
    notes: 'Boa paleta neutra e uso de espaço negativo.',
    createdAt: '2026-04-02',
    fileName: 'branding-premium.jpg',
    fileSizeMb: 6,
  },
  {
    id: '4',
    profileId: 'profile-acme-demo',
    title: 'Gravação de tela com edição dinâmica',
    description:
      'Boa referência para vídeos explicativos mostrando ferramenta na prática com cortes ágeis.',
    type: 'screen_recording',
    source: 'Upload',
    thumbnail: 'https://picsum.photos/seed/ref4/600/600',
    tags: ['tutorial', 'edição', 'produto'],
    folder: 'Tutoriais',
    campaign: 'Produto',
    platform: 'YouTube',
    format: 'Tutorial',
    notes: 'Boa para explicar funcionalidade de forma prática.',
    createdAt: '2026-04-01',
    fileName: 'demo-produto.mov',
    fileSizeMb: 215,
  },
];

const TYPE_LABEL: Record<ReferenceType, string> = {
  link: 'Link',
  image: 'Imagem',
  video: 'Vídeo',
  screen_recording: 'Gravação',
};

const TYPE_ICON: Record<ReferenceType, React.ComponentType<{ className?: string }>> = {
  link: LinkIcon,
  image: ImageIcon,
  video: Video,
  screen_recording: PlayCircle,
};

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'link' as ReferenceType,
  source: '',
  sourceUrl: '',
  thumbnail: '',
  tags: '',
  folder: '',
  campaign: '',
  platform: '',
  format: '',
  notes: '',
  fileName: '',
  fileSizeMb: '',
};

export const References = () => {
  const [references, setReferences] = React.useState<ReferenceItem[]>(INITIAL_REFERENCES);
  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [selectedReference, setSelectedReference] = React.useState<ReferenceItem | null>(null);
  const [editingReference, setEditingReference] = React.useState<ReferenceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [referenceToDelete, setReferenceToDelete] = React.useState<ReferenceItem | null>(null);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState(EMPTY_FORM);

  const profileReferences = React.useMemo(() => {
    return references.filter((item) => item.profileId === ACTIVE_PROFILE_ID);
  }, [references]);

  const filteredReferences = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return profileReferences;

    return profileReferences.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.source,
        item.folder,
        item.campaign,
        item.platform,
        item.format,
        item.notes,
        ...item.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [profileReferences, search]);

  const collections = React.useMemo(() => {
    const folderMap = new Map<string, number>();

    profileReferences.forEach((item) => {
      const key = item.folder?.trim() || 'Sem coleção';
      folderMap.set(key, (folderMap.get(key) || 0) + 1);
    });

    return Array.from(folderMap.entries()).map(([name, count], index) => {
      const colors = [
        'bg-orange-100 text-orange-600',
        'bg-blue-100 text-blue-600',
        'bg-pink-100 text-pink-600',
        'bg-emerald-100 text-emerald-600',
        'bg-violet-100 text-violet-600',
      ];

      return {
        name,
        count,
        color: colors[index % colors.length],
      };
    });
  }, [profileReferences]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingReference(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (reference: ReferenceItem) => {
    setEditingReference(reference);
    setForm({
      title: reference.title,
      description: reference.description,
      type: reference.type,
      source: reference.source,
      sourceUrl: reference.sourceUrl || '',
      thumbnail: reference.thumbnail,
      tags: reference.tags.join(', '),
      folder: reference.folder || '',
      campaign: reference.campaign || '',
      platform: reference.platform || '',
      format: reference.format || '',
      notes: reference.notes || '',
      fileName: reference.fileName || '',
      fileSizeMb: reference.fileSizeMb ? String(reference.fileSizeMb) : '',
    });
    setShowCreateModal(true);
    setMenuOpenId(null);
  };

  const handleSaveReference = () => {
    const title = form.title.trim();
    if (!title) return;

    const parsedTags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload: ReferenceItem = {
      id: editingReference?.id || crypto.randomUUID(),
      profileId: ACTIVE_PROFILE_ID,
      title,
      description: form.description.trim(),
      type: form.type,
      source: form.source.trim() || 'Upload',
      sourceUrl: form.sourceUrl.trim() || undefined,
      thumbnail:
        form.thumbnail.trim() ||
        `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600`,
      tags: parsedTags,
      folder: form.folder.trim() || undefined,
      campaign: form.campaign.trim() || undefined,
      platform: form.platform.trim() || undefined,
      format: form.format.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: editingReference?.createdAt || new Date().toISOString().slice(0, 10),
      fileName: form.fileName.trim() || undefined,
      fileSizeMb: form.fileSizeMb ? Number(form.fileSizeMb) : undefined,
    };

    if (editingReference) {
      setReferences((prev) =>
        prev.map((item) => (item.id === editingReference.id ? payload : item))
      );
    } else {
      setReferences((prev) => [payload, ...prev]);
    }

    setShowCreateModal(false);
    resetForm();
  };

  const handleCopyLink = async (reference: ReferenceItem) => {
    const value = reference.sourceUrl || reference.title;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // noop
    }
  };

  const requestDelete = (reference: ReferenceItem) => {
    setReferenceToDelete(reference);
    setShowDeleteModal(true);
    setMenuOpenId(null);
  };

  const confirmDelete = () => {
    if (!referenceToDelete) return;

    setReferences((prev) => prev.filter((item) => item.id !== referenceToDelete.id));

    if (selectedReference?.id === referenceToDelete.id) {
      setSelectedReference(null);
    }

    setReferenceToDelete(null);
    setShowDeleteModal(false);
  };

  const ReferencePreviewIcon = ({ type }: { type: ReferenceType }) => {
    const Icon = TYPE_ICON[type];
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <BookOpen className="h-6 w-6 text-brand" />
            Banco de Referências
          </h1>
          <p className="max-w-2xl text-text-secondary">
            Salve links, imagens, vídeos e gravações de tela para organizar repertório criativo por
            marca, campanha e formato.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="border-none bg-brand/10 text-brand">
            Profile ativo: {ACTIVE_PROFILE_ID}
          </Badge>
          <Button className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Adicionar Referência
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <Input
              placeholder="Buscar por título, tag, campanha, formato..."
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex w-full items-center gap-3 overflow-x-auto pb-2 lg:w-auto lg:pb-0">
            <Button variant="outline" size="sm" className="shrink-0 gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>

            <div className="h-8 w-px shrink-0 bg-gray-200" />

            <div className="flex shrink-0 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-gray-500 hover:text-text-primary'
                )}
                aria-label="Modo grade"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'list'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-gray-500 hover:text-text-primary'
                )}
                aria-label="Modo lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-none bg-gray-100 text-text-secondary">
            {profileReferences.length} referências
          </Badge>
          <Badge className="border-none bg-gray-100 text-text-secondary">
            {collections.length} coleções
          </Badge>
          <Badge className="border-none bg-gray-100 text-text-secondary">
            Links, uploads e gravações
          </Badge>
        </div>
      </Card>

      {filteredReferences.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <BookOpen className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Nenhuma referência encontrada</h3>
            <p className="text-sm text-text-secondary">
              Tente outro termo de busca ou adicione uma nova referência para este perfil.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Criar primeira referência
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredReferences.map((ref) => {
            const TypeIcon = TYPE_ICON[ref.type];

            return (
              <Card
                key={ref.id}
                padding="none"
                className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={ref.thumbnail}
                    alt={ref.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary transition-colors hover:bg-brand hover:text-white"
                      onClick={() => setSelectedReference(ref)}
                    >
                      <Eye className="h-5 w-5" />
                    </button>

                    {ref.sourceUrl && (
                      <a
                        href={ref.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary transition-colors hover:bg-brand hover:text-white"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}

                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary transition-colors hover:bg-brand hover:text-white"
                      onClick={() => handleCopyLink(ref)}
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <Badge className="border-none bg-white/90 text-text-primary shadow-sm backdrop-blur-sm">
                      <span className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {TYPE_LABEL[ref.type]}
                      </span>
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-bold leading-tight text-text-primary">
                      {ref.title}
                    </h3>

                    <div className="relative shrink-0">
                      <button
                        className="text-gray-400 transition-colors hover:text-text-primary"
                        onClick={() => setMenuOpenId((prev) => (prev === ref.id ? null : ref.id))}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {menuOpenId === ref.id && (
                        <div className="absolute right-0 top-6 z-20 min-w-[160px] rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-gray-50"
                            onClick={() => setSelectedReference(ref)}
                          >
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-gray-50"
                            onClick={() => openEditModal(ref)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => requestDelete(ref)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                    {ref.description}
                  </p>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {ref.source}
                    </span>
                    {ref.platform && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        {ref.platform}
                      </span>
                    )}
                    {ref.format && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        {ref.format}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {ref.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded bg-brand/5 px-1.5 py-0.5 text-[10px] text-brand"
                      >
                        <Tag className="h-2 w-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReferences.map((ref) => (
            <Card key={ref.id} className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 md:w-24">
                <img
                  src={ref.thumbnail}
                  alt={ref.title}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className="border-none bg-brand/10 text-brand">
                    <span className="flex items-center gap-1">
                      <ReferencePreviewIcon type={ref.type} />
                      {TYPE_LABEL[ref.type]}
                    </span>
                  </Badge>
                  <span className="text-xs text-text-secondary">{ref.source}</span>
                  {ref.folder && <span className="text-xs text-text-secondary">• {ref.folder}</span>}
                </div>

                <h3 className="text-sm font-bold text-text-primary">{ref.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{ref.description}</p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ref.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded bg-brand/5 px-1.5 py-0.5 text-[10px] text-brand"
                    >
                      <Tag className="h-2 w-2" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedReference(ref)}>
                  <Eye className="h-4 w-4" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditModal(ref)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => requestDelete(ref)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text-primary">
            <Folder className="h-5 w-5 text-brand" />
            Suas Coleções
          </h2>
          <Button variant="ghost" size="sm" className="text-brand">
            Ver Tudo
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {collections.map((folder) => (
            <Card
              key={folder.name}
              className="cursor-pointer transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    folder.color
                  )}
                >
                  <Folder className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{folder.name}</h3>
                  <p className="text-xs text-text-secondary">{folder.count} itens</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  {editingReference ? 'Editar referência' : 'Adicionar referência'}
                </h3>
                <p className="text-sm text-text-secondary">
                  Salve links, imagens, vídeos e gravações de tela no profile ativo.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 px-6 py-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary">Título</label>
                <Input
                  placeholder="Ex: Reel com hook forte para social media"
                  value={form.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value as ReferenceType }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
                >
                  <option value="link">Link</option>
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="screen_recording">Gravação de tela</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Origem</label>
                <Input
                  placeholder="Instagram, TikTok, Upload, LinkedIn..."
                  value={form.source}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, source: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary">
                  Link da publicação
                </label>
                <Input
                  placeholder="https://..."
                  icon={<LinkIcon className="h-4 w-4" />}
                  value={form.sourceUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, sourceUrl: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary">
                  Thumbnail / imagem de preview
                </label>
                <Input
                  placeholder="Cole a URL da thumbnail ou use upload depois"
                  value={form.thumbnail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, thumbnail: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Plataforma</label>
                <Input
                  placeholder="Instagram, TikTok, YouTube..."
                  value={form.platform}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, platform: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Formato</label>
                <Input
                  placeholder="Reel, Story, Carrossel..."
                  value={form.format}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, format: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Coleção</label>
                <Input
                  placeholder="Ex: Reels, Branding, Hooks..."
                  value={form.folder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, folder: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Campanha</label>
                <Input
                  placeholder="Ex: Lançamento, Captação Premium..."
                  value={form.campaign}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, campaign: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary">Tags</label>
                <Input
                  placeholder="Separe por vírgula: hook, retenção, imobiliário"
                  value={form.tags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Nome do arquivo</label>
                <Input
                  placeholder="Ex: referencia-hook.mp4"
                  value={form.fileName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, fileName: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-text-primary">Tamanho (MB)</label>
                <Input
                  placeholder="Até 500"
                  value={form.fileSizeMb}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, fileSizeMb: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary">Descrição</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Explique por que essa referência é útil para a equipe."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary">
                  Notas criativas / adaptação para a marca
                </label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: adaptar esse hook para imóveis, trocar ritmo de edição, usar CTA mais direto..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
                />
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary">Área de upload</h4>
                      <p className="text-sm text-text-secondary">
                        No próximo passo, conecte aqui upload real para imagem, vídeo e gravação de
                        tela com limite de até 500MB por arquivo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveReference}>
                {editingReference ? 'Salvar alterações' : 'Adicionar referência'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedReference && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{selectedReference.title}</h3>
                <p className="text-sm text-text-secondary">
                  Visualização completa da referência salva neste profile.
                </p>
              </div>
              <button
                onClick={() => setSelectedReference(null)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-2xl bg-gray-100">
                <img
                  src={selectedReference.thumbnail}
                  alt={selectedReference.title}
                  className="h-full max-h-[560px] w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-none bg-brand/10 text-brand">
                    {TYPE_LABEL[selectedReference.type]}
                  </Badge>
                  <Badge className="border-none bg-gray-100 text-text-secondary">
                    {selectedReference.source}
                  </Badge>
                  {selectedReference.platform && (
                    <Badge className="border-none bg-gray-100 text-text-secondary">
                      {selectedReference.platform}
                    </Badge>
                  )}
                  {selectedReference.format && (
                    <Badge className="border-none bg-gray-100 text-text-secondary">
                      {selectedReference.format}
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Descrição
                  </h4>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {selectedReference.description || 'Sem descrição.'}
                  </p>
                </div>

                {selectedReference.notes && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Notas criativas
                    </h4>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {selectedReference.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Coleção
                    </h4>
                    <p className="text-sm text-text-primary">
                      {selectedReference.folder || 'Sem coleção'}
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Campanha
                    </h4>
                    <p className="text-sm text-text-primary">
                      {selectedReference.campaign || 'Sem campanha'}
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Arquivo
                    </h4>
                    <p className="text-sm text-text-primary">
                      {selectedReference.fileName || 'Sem arquivo'}
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Tamanho
                    </h4>
                    <p className="text-sm text-text-primary">
                      {selectedReference.fileSizeMb ? `${selectedReference.fileSizeMb} MB` : '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReference.tags.length > 0 ? (
                      selectedReference.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 rounded-md bg-brand/5 px-2 py-1 text-xs text-brand"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-text-secondary">Sem tags.</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {selectedReference.sourceUrl && (
                    <a
                      href={selectedReference.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex"
                    >
                      <Button className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Abrir link
                      </Button>
                    </a>
                  )}

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleCopyLink(selectedReference)}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => openEditModal(selectedReference)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => requestDelete(selectedReference)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && referenceToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary">Excluir referência</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Tem certeza que deseja excluir <strong>{referenceToDelete.title}</strong>? Essa ação
              remove a referência da biblioteca deste profile.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setReferenceToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
