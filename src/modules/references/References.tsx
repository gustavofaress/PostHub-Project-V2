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
  FileVideo,
  FileImage,
  Globe,
  Loader2,
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';
import {
  renderCompressedVideo,
  TARGET_VIDEO_UPLOAD_SIZE,
} from '../../shared/utils/mediaProcessing';
import { useProfile } from '../../app/context/ProfileContext';
import { referencesService } from '../../services/references.service';
import type { ReferenceItem, ReferenceType } from '../../types/reference.types';

type ViewMode = 'grid' | 'list';
type CreateTab = 'link' | 'image' | 'video' | 'screen_recording';
type ReferenceNotice = {
  title: string;
  message: string;
};

interface FormState {
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  tags: string;
  folder: string;
  campaign: string;
  platform: string;
  format: string;
  notes: string;
}

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

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  source: '',
  sourceUrl: '',
  tags: '',
  folder: '',
  campaign: '',
  platform: '',
  format: '',
  notes: '',
};

const inferPlatformFromUrl = (url: string): string => {
  const normalized = url.toLowerCase();

  if (normalized.includes('instagram.com')) return 'Instagram';
  if (normalized.includes('tiktok.com')) return 'TikTok';
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'YouTube';
  if (normalized.includes('linkedin.com')) return 'LinkedIn';
  if (normalized.includes('facebook.com')) return 'Facebook';
  if (normalized.includes('pinterest.com')) return 'Pinterest';
  if (normalized.includes('x.com') || normalized.includes('twitter.com')) return 'X';
  if (normalized.includes('dribbble.com')) return 'Dribbble';
  if (normalized.includes('behance.net')) return 'Behance';

  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname || 'Link externo';
  } catch {
    return 'Link externo';
  }
};

const inferSourceFromTab = (tab: CreateTab, source: string, sourceUrl: string) => {
  if (source.trim()) return source.trim();
  if (tab === 'link' && sourceUrl.trim()) return inferPlatformFromUrl(sourceUrl);
  return 'Upload';
};

const isGeneratedPreviewUrl = (url?: string | null) => Boolean(url?.includes('picsum.photos/seed/'));

const getPreviewImage = (reference: ReferenceItem) => {
  const thumbnailUrl = isGeneratedPreviewUrl(reference.thumbnail_url) ? null : reference.thumbnail_url;

  if (reference.type === 'link') {
    return thumbnailUrl || null;
  }

  if (reference.type === 'image') {
    return thumbnailUrl || reference.file_url || null;
  }

  return null;
};

const formatFileSize = (size?: number | null) => (size ? `${size} MB` : '—');

const getAcceptByTab = (tab: CreateTab) => {
  if (tab === 'image') return 'image/*';
  return 'video/*';
};

const getFileKindError = (tab: CreateTab, file: File) => {
  if (tab === 'link') return null;

  if (!file.type) {
    return null;
  }

  if (tab === 'image' && !file.type.startsWith('image/')) {
    return 'Selecione um arquivo de imagem para esta aba.';
  }

  if ((tab === 'video' || tab === 'screen_recording') && !file.type.startsWith('video/')) {
    return 'Selecione um arquivo de vídeo para esta aba.';
  }

  return null;
};

const ReferencePreviewFallback = ({
  reference,
  className,
}: {
  reference: ReferenceItem;
  className?: string;
}) => {
  const Icon = TYPE_ICON[reference.type];

  return (
    <div className={cn('flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-100 to-slate-200 p-4', className)}>
      <div className="flex items-center justify-between">
        <Badge className="border-none bg-white/90 text-text-primary shadow-sm">
          <span className="flex items-center gap-1">
            {reference.type === 'link' ? <Globe className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
            {reference.platform || reference.source || TYPE_LABEL[reference.type]}
          </span>
        </Badge>
      </div>
      <div>
        <p className="line-clamp-3 text-sm font-bold leading-tight text-slate-800">{reference.title}</p>
        <p className="mt-2 line-clamp-2 text-xs text-slate-500">
          {reference.source_url || reference.description || reference.file_name || 'Prévia indisponível.'}
        </p>
      </div>
    </div>
  );
};

const ReferenceImagePreview = ({
  reference,
  src,
  className,
}: {
  reference: ReferenceItem;
  src: string;
  className?: string;
}) => {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return <ReferencePreviewFallback reference={reference} className={className} />;
  }

  return (
    <img
      src={src}
      alt={reference.title}
      className={cn('h-full w-full object-cover', className)}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};

export const References = () => {
  const { activeProfile } = useProfile();
  const profileId = activeProfile?.id;

  const [references, setReferences] = React.useState<ReferenceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [selectedReference, setSelectedReference] = React.useState<ReferenceItem | null>(null);
  const [editingReference, setEditingReference] = React.useState<ReferenceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [referenceToDelete, setReferenceToDelete] = React.useState<ReferenceItem | null>(null);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<CreateTab>('link');
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = React.useState<string>('');
  const [filePreviewLabel, setFilePreviewLabel] = React.useState<string>('');
  const [linkPreviewUrl, setLinkPreviewUrl] = React.useState<string>('');
  const [linkPreviewPlatform, setLinkPreviewPlatform] = React.useState<string>('');
  const [notice, setNotice] = React.useState<ReferenceNotice | null>(null);
  const [isRenderingMaterial, setIsRenderingMaterial] = React.useState(false);
  const [materialRenderProgress, setMaterialRenderProgress] = React.useState(0);
  const [materialRenderStatus, setMaterialRenderStatus] = React.useState('');

  const loadReferences = React.useCallback(async () => {
    if (!profileId) {
      setReferences([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await referencesService.listByProfile(profileId);
      setReferences(data);
    } catch (error) {
      console.error('Erro ao carregar referências:', error);
      setReferences([]);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  React.useEffect(() => {
    return () => {
      if (filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const filteredReferences = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return references;

    return references.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.source,
        item.folder,
        item.campaign,
        item.platform,
        item.format,
        item.notes,
        item.file_name,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [references, search]);

  const collections = React.useMemo(() => {
    const folderMap = new Map<string, number>();

    references.forEach((item) => {
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
  }, [references]);

  const resetForm = () => {
    if (filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setForm(EMPTY_FORM);
    setEditingReference(null);
    setActiveTab('link');
    setSelectedFile(null);
    setFilePreviewUrl('');
    setFilePreviewLabel('');
    setLinkPreviewUrl('');
    setLinkPreviewPlatform('');
  };

  const clearSelectedMaterial = () => {
    if (filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(null);
    setFilePreviewUrl('');
    setFilePreviewLabel('');
  };

  const handleTabChange = (tab: CreateTab) => {
    if (tab === activeTab) return;

    clearSelectedMaterial();
    setActiveTab(tab);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (reference: ReferenceItem) => {
    setEditingReference(reference);
    setActiveTab(reference.type);
    setForm({
      title: reference.title,
      description: reference.description,
      source: reference.source,
      sourceUrl: reference.source_url || '',
      tags: (reference.tags || []).join(', '),
      folder: reference.folder || '',
      campaign: reference.campaign || '',
      platform: reference.platform || '',
      format: reference.format || '',
      notes: reference.notes || '',
    });
    setSelectedFile(null);
    setFilePreviewUrl(reference.type === 'link' ? '' : reference.thumbnail_url || reference.file_url || '');
    setFilePreviewLabel(reference.file_name || '');
    setLinkPreviewUrl(
      reference.type === 'link' && !isGeneratedPreviewUrl(reference.thumbnail_url) ? reference.thumbnail_url || '' : ''
    );
    setLinkPreviewPlatform(reference.platform || reference.source || '');
    setShowCreateModal(true);
    setMenuOpenId(null);
  };

  const handleGenerateLinkPreview = () => {
    const url = form.sourceUrl.trim();
    if (!url) return;

    const platform = inferPlatformFromUrl(url);
    setLinkPreviewPlatform(platform);
    setLinkPreviewUrl('');

    setForm((prev) => ({
      ...prev,
      source: prev.source.trim() || platform,
      platform: prev.platform.trim() || platform,
      title: prev.title.trim() || `Referência de ${platform}`,
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      setNotice({
        title: 'Arquivo muito grande',
        message: 'O arquivo excede o limite de 500MB.',
      });
      event.target.value = '';
      return;
    }

    const fileKindError = getFileKindError(activeTab, file);

    if (fileKindError) {
      setNotice({
        title: 'Arquivo incompatível',
        message: fileKindError,
      });
      event.target.value = '';
      return;
    }

    if (filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setFilePreviewUrl(objectUrl);
    setFilePreviewLabel(file.name);

    setForm((prev) => ({
      ...prev,
      source: prev.source.trim() || 'Upload',
    }));
  };

  const prepareMaterialForUpload = async (file: File) => {
    const fileKindError = getFileKindError(activeTab, file);

    if (fileKindError) {
      throw new Error(fileKindError);
    }

    if (activeTab === 'image') {
      if (file.size > TARGET_VIDEO_UPLOAD_SIZE) {
        throw new Error(
          'A imagem excede o limite aceito pelo Supabase. Reduza o arquivo antes de enviar.'
        );
      }

      return file;
    }

    const isVideoMaterial = activeTab === 'video' || activeTab === 'screen_recording';

    if (!isVideoMaterial) {
      return file;
    }

    let createdPreviewUrl = '';
    const sourceUrl = filePreviewUrl || URL.createObjectURL(file);

    if (!filePreviewUrl) {
      createdPreviewUrl = sourceUrl;
    }

    try {
      return await renderCompressedVideo(file, sourceUrl, (progress, status) => {
        setMaterialRenderProgress(progress);
        setMaterialRenderStatus(status);
      });
    } finally {
      if (createdPreviewUrl) {
        URL.revokeObjectURL(createdPreviewUrl);
      }
    }
  };

  const handleSaveReference = async () => {
    if (!profileId || isSaving) return;

    const title = form.title.trim();
    if (!title) return;

    const parsedTags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    setIsSaving(true);
    const shouldRenderMaterialPopup = activeTab !== 'link';

    if (shouldRenderMaterialPopup) {
      setIsRenderingMaterial(true);
      setMaterialRenderProgress(5);
      setMaterialRenderStatus('Preparando material...');
    }

    try {
      if (editingReference) {
        let uploadData:
          | {
              fileUrl: string;
              fileName: string;
              fileSizeMb: number;
            }
          | undefined;

        if (selectedFile) {
          setMaterialRenderProgress(35);
          setMaterialRenderStatus('Preparando material...');
          const uploadFile = await prepareMaterialForUpload(selectedFile);
          setMaterialRenderProgress(95);
          setMaterialRenderStatus('Enviando material para o Supabase...');
          const uploaded = await referencesService.uploadFile(profileId, uploadFile);
          setMaterialRenderProgress(98);
          setMaterialRenderStatus('Salvando referência...');
          uploadData = {
            fileUrl: uploaded.fileUrl,
            fileName: uploaded.fileName,
            fileSizeMb: uploaded.fileSizeMb,
          };
        } else if (shouldRenderMaterialPopup) {
          setMaterialRenderProgress(65);
          setMaterialRenderStatus('Salvando referência...');
        }

        await referencesService.update({
          id: editingReference.id,
          title,
          description: form.description.trim(),
          source: form.source.trim() || editingReference.source,
          source_url: form.sourceUrl.trim() || undefined,
          thumbnail_url:
            activeTab === 'link'
              ? linkPreviewUrl || null
              : uploadData?.fileUrl || editingReference.thumbnail_url || undefined,
          file_url:
            activeTab === 'link'
              ? undefined
              : uploadData?.fileUrl || editingReference.file_url || undefined,
          tags: parsedTags,
          folder: form.folder.trim() || undefined,
          campaign: form.campaign.trim() || undefined,
          platform: form.platform.trim() || undefined,
          format: form.format.trim() || undefined,
          notes: form.notes.trim() || undefined,
          file_name: uploadData?.fileName || editingReference.file_name || undefined,
          file_size_mb: uploadData?.fileSizeMb || editingReference.file_size_mb || undefined,
          type: activeTab as ReferenceType,
        });
      } else {
        if (activeTab === 'link') {
          await referencesService.create({
            profile_id: profileId,
            title,
            description: form.description.trim(),
            type: 'link',
            source: form.source.trim() || inferPlatformFromUrl(form.sourceUrl),
            source_url: form.sourceUrl.trim() || undefined,
            thumbnail_url: linkPreviewUrl || null,
            tags: parsedTags,
            folder: form.folder.trim() || undefined,
            campaign: form.campaign.trim() || undefined,
            platform: form.platform.trim() || undefined,
            format: form.format.trim() || undefined,
            notes: form.notes.trim() || undefined,
          });
        } else if (selectedFile) {
          setMaterialRenderProgress(35);
          setMaterialRenderStatus('Preparando material...');
          const uploadFile = await prepareMaterialForUpload(selectedFile);
          setMaterialRenderProgress(95);
          setMaterialRenderStatus('Enviando material para o Supabase...');
          const upload = await referencesService.uploadFile(profileId, uploadFile);
          setMaterialRenderProgress(98);
          setMaterialRenderStatus('Salvando referência...');

          await referencesService.create({
            profile_id: profileId,
            title,
            description: form.description.trim(),
            type: activeTab as 'image' | 'video' | 'screen_recording',
            source: form.source.trim() || 'Upload',
            source_url: form.sourceUrl.trim() || undefined,
            thumbnail_url: upload.fileUrl,
            file_url: upload.fileUrl,
            tags: parsedTags,
            folder: form.folder.trim() || undefined,
            campaign: form.campaign.trim() || undefined,
            platform: form.platform.trim() || undefined,
            format: form.format.trim() || undefined,
            notes: form.notes.trim() || undefined,
            file_name: upload.fileName,
            file_size_mb: upload.fileSizeMb,
          });
        } else {
          setNotice({
            title: 'Material obrigatório',
            message: 'Selecione um arquivo para salvar esta referência.',
          });
          return;
        }
      }

      if (shouldRenderMaterialPopup) {
        setMaterialRenderProgress(95);
        setMaterialRenderStatus('Atualizando biblioteca...');
      }

      await loadReferences();
      if (shouldRenderMaterialPopup) {
        setMaterialRenderProgress(100);
        setMaterialRenderStatus('Material salvo.');
      }
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar referência:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';
      setNotice({
        title: 'Não foi possível salvar a referência',
        message,
      });
    } finally {
      setIsRenderingMaterial(false);
      setMaterialRenderProgress(0);
      setMaterialRenderStatus('');
      setIsSaving(false);
    }
  };

  const handleCopyLink = async (reference: ReferenceItem) => {
    const value = reference.source_url || reference.file_url || reference.title;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      console.error('Não foi possível copiar.');
    }
  };

  const requestDelete = (reference: ReferenceItem) => {
    setReferenceToDelete(reference);
    setShowDeleteModal(true);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (!referenceToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      await referencesService.remove(referenceToDelete.id);
      await loadReferences();

      if (selectedReference?.id === referenceToDelete.id) {
        setSelectedReference(null);
      }

      setReferenceToDelete(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Erro ao excluir referência:', error);
      setNotice({
        title: 'Não foi possível excluir a referência',
        message: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const ReferencePreviewIcon = ({ type }: { type: ReferenceType }) => {
    const Icon = TYPE_ICON[type];
    return <Icon className="h-4 w-4" />;
  };

  const renderReferencePreview = (reference: ReferenceItem, className?: string) => {
    const previewImage = getPreviewImage(reference);
    const previewVideo = reference.file_url || reference.thumbnail_url;

    if (reference.type === 'link' && !previewImage) {
      return <ReferencePreviewFallback reference={reference} className={className} />;
    }

    if ((reference.type === 'video' || reference.type === 'screen_recording') && previewVideo) {
      return (
        <video
          src={previewVideo}
          className={cn('h-full w-full object-cover', className)}
          muted
          playsInline
          preload="metadata"
          onMouseEnter={(event) => {
            void event.currentTarget.play();
          }}
          onMouseLeave={(event) => {
            event.currentTarget.pause();
            event.currentTarget.currentTime = 0;
          }}
        />
      );
    }

    if (previewImage) {
      return <ReferenceImagePreview reference={reference} src={previewImage} className={className} />;
    }

    return <ReferencePreviewFallback reference={reference} className={className} />;
  };

  const renderModalPreview = () => {
    if (activeTab === 'link') {
      if (!form.sourceUrl.trim()) {
        return (
          <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-text-secondary">
            Cole o link da publicação para gerar uma prévia.
          </div>
        );
      }

      if (linkPreviewUrl) {
        return (
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            {editingReference ? (
              <ReferenceImagePreview
                reference={editingReference}
                src={linkPreviewUrl}
                className="h-[260px] w-full object-cover"
              />
            ) : (
              <img
                src={linkPreviewUrl}
                alt="Prévia do link"
                className="h-[260px] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        );
      }

      return (
        <div className="flex h-[260px] flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {linkPreviewPlatform || inferPlatformFromUrl(form.sourceUrl)}
              </p>
              <p className="text-xs text-text-secondary">Prévia visual do link</p>
            </div>
          </div>
          <div>
            <p className="line-clamp-2 text-base font-bold text-slate-800">
              {form.title.trim() || 'Título da referência'}
            </p>
            <p className="mt-2 line-clamp-3 text-sm text-slate-500">{form.sourceUrl}</p>
          </div>
        </div>
      );
    }

    if (filePreviewUrl) {
      if (activeTab === 'image') {
        return (
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            <img src={filePreviewUrl} alt="Prévia do arquivo" className="h-[260px] w-full object-cover" />
          </div>
        );
      }

      return (
        <div className="relative overflow-hidden rounded-2xl bg-gray-100">
          <video src={filePreviewUrl} className="h-[260px] w-full object-cover" controls />
        </div>
      );
    }

    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-text-secondary">
        Faça upload do arquivo para visualizar a prévia.
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
              <BookOpen className="h-6 w-6 text-brand" />
              Banco de Referências
            </h1>
            <p className="max-w-2xl text-text-secondary">
              Salve links, prints, vídeos e gravações de tela para organizar repertório criativo por marca, campanha e formato.
            </p>
          </div>
        </div>

        <Card className="flex items-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <p className="text-text-secondary">Carregando referências...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <BookOpen className="h-6 w-6 text-brand" />
            Banco de Referências
          </h1>
          <p className="max-w-2xl text-text-secondary">
            Salve links, prints, vídeos e gravações de tela para organizar repertório criativo por marca, campanha e formato.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="border-none bg-brand/10 text-brand">
            Profile ativo: {activeProfile?.name || profileId || '—'}
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
                  viewMode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-text-primary'
                )}
                aria-label="Modo grade"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'list' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-text-primary'
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
            {references.length} referências
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
                  {renderReferencePreview(ref, 'transition-transform duration-500 group-hover:scale-105')}

                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-primary transition-colors hover:bg-brand hover:text-white"
                      onClick={() => setSelectedReference(ref)}
                    >
                      <Eye className="h-5 w-5" />
                    </button>

                    {ref.source_url && (
                      <a
                        href={ref.source_url}
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
                    {(ref.tags || []).map((tag) => (
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
                {renderReferencePreview(ref)}
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
                  {(ref.tags || []).map((tag) => (
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
            <Card key={folder.name} className="cursor-pointer transition-colors hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', folder.color)}>
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
          <div className="max-h-[92vh] w-full max-w-5xl overflow-x-hidden overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  {editingReference ? 'Editar referência' : 'Adicionar referência'}
                </h3>
                <p className="text-sm text-text-secondary">
                  A prévia visual será gerada a partir do link, do print enviado ou do arquivo de vídeo.
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

            <div className="border-b border-gray-100 px-6 pt-5">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'link', label: 'Colar link', icon: LinkIcon },
                  { key: 'image', label: 'Subir print/imagem', icon: FileImage },
                  { key: 'video', label: 'Subir vídeo', icon: FileVideo },
                  { key: 'screen_recording', label: 'Gravação de tela', icon: PlayCircle },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key as CreateTab)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-gray-200 bg-white text-text-secondary hover:border-brand/30 hover:text-text-primary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 overflow-x-hidden px-6 py-6 lg:grid-cols-[1fr_1fr]">
              <div className="min-w-0 space-y-5">
                {activeTab === 'link' ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-text-primary">
                        Link da publicação
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="https://..."
                            icon={<LinkIcon className="h-4 w-4" />}
                            value={form.sourceUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setForm((prev) => ({ ...prev, sourceUrl: e.target.value }))
                            }
                          />
                        </div>
                        <Button type="button" variant="outline" onClick={handleGenerateLinkPreview}>
                          Gerar prévia
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-text-primary">Prévia por link</h4>
                          <p className="text-sm text-text-secondary">
                            Neste MVP, a prévia é simulada visualmente. Depois você pode trocar isso por uma Edge Function que resolve metadados do link.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-text-primary">
                      {activeTab === 'image'
                        ? 'Upload de print ou imagem'
                        : activeTab === 'video'
                        ? 'Upload de vídeo'
                        : 'Upload de gravação de tela'}
                    </label>

                    <label className="block cursor-pointer rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-5 transition-colors hover:bg-brand/10">
                      <input
                        type="file"
                        accept={getAcceptByTab(activeTab)}
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-text-primary">Selecionar arquivo</h4>
                          <p className="text-sm text-text-secondary">
                            Suporta até 500MB. A thumbnail será o próprio print ou a prévia visual do vídeo enviado.
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Título</label>
                  <Input
                    placeholder="Ex: Reel com hook forte para social media"
                    value={form.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-text-primary">Campanha</label>
                    <Input
                      placeholder="Ex: Lançamento, Captação Premium..."
                      value={form.campaign}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({ ...prev, campaign: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
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
                  <label className="mb-2 block text-sm font-semibold text-text-primary">Descrição</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Explique por que essa referência é útil para a equipe."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
                  />
                </div>

                <div>
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
              </div>

              <div className="min-w-0 space-y-4">
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Prévia da referência
                  </h4>
                  {renderModalPreview()}
                </div>

                <Card className="min-w-0 space-y-3 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <Badge className="border-none bg-brand/10 text-brand">
                      {TYPE_LABEL[activeTab as ReferenceType]}
                    </Badge>
                    {(form.platform || linkPreviewPlatform) && (
                      <Badge className="border-none bg-gray-100 text-text-secondary">
                        {form.platform || linkPreviewPlatform}
                      </Badge>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h5 className="line-clamp-2 break-words text-sm font-bold text-text-primary">
                      {form.title.trim() || 'Título da referência'}
                    </h5>
                    <p className="mt-1 text-sm text-text-secondary">
                      {form.description.trim() || 'A descrição aparecerá aqui.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Origem</p>
                      <p className="break-words text-text-primary">{form.source.trim() || '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tamanho</p>
                      <p className="text-text-primary">
                        {selectedFile
                          ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                          : formatFileSize(editingReference?.file_size_mb)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Profile</p>
                      <p className="break-words text-text-primary">{activeProfile?.name || profileId || '—'}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveReference} disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </span>
                ) : editingReference ? (
                  'Salvar alterações'
                ) : (
                  'Adicionar referência'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedReference && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold text-text-primary">
                  {selectedReference.title}
                </h3>
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
                {selectedReference.type === 'image' && getPreviewImage(selectedReference) ? (
                  <ReferenceImagePreview
                    reference={selectedReference}
                    src={getPreviewImage(selectedReference) as string}
                    className="h-full max-h-[560px] w-full object-cover"
                  />
                ) : selectedReference.type === 'video' || selectedReference.type === 'screen_recording' ? (
                  selectedReference.file_url ? (
                    <video
                      src={selectedReference.file_url}
                      className="h-full max-h-[560px] w-full object-cover"
                      controls
                    />
                  ) : (
                    <ReferencePreviewFallback
                      reference={selectedReference}
                      className="h-full max-h-[560px] w-full object-cover"
                    />
                  )
                ) : getPreviewImage(selectedReference) ? (
                  <ReferenceImagePreview
                    reference={selectedReference}
                    src={getPreviewImage(selectedReference) as string}
                    className="h-full max-h-[560px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[420px] flex-col justify-between bg-gradient-to-br from-slate-100 to-slate-200 p-6">
                    <div className="flex items-center gap-2">
                      <Badge className="border-none bg-white text-text-primary">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {selectedReference.platform || selectedReference.source || 'Link'}
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <p className="text-2xl font-bold leading-tight text-slate-800">
                        {selectedReference.title}
                      </p>
                      <p className="mt-3 text-sm text-slate-500">
                        {selectedReference.source_url || 'Sem link disponível.'}
                      </p>
                    </div>
                  </div>
                )}
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
                  <div className="min-w-0">
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Coleção
                    </h4>
                    <p className="break-words text-sm text-text-primary">
                      {selectedReference.folder || 'Sem coleção'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Campanha
                    </h4>
                    <p className="break-words text-sm text-text-primary">
                      {selectedReference.campaign || 'Sem campanha'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Arquivo
                    </h4>
                    <p className="break-all text-sm text-text-primary">
                      {selectedReference.file_name || 'Sem arquivo'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Tamanho
                    </h4>
                    <p className="text-sm text-text-primary">{formatFileSize(selectedReference.file_size_mb)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedReference.tags || []).length > 0 ? (
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
                  {selectedReference.source_url && (
                    <a href={selectedReference.source_url} target="_blank" rel="noreferrer" className="inline-flex">
                      <Button className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Abrir link
                      </Button>
                    </a>
                  )}

                  <Button variant="outline" className="gap-2" onClick={() => handleCopyLink(selectedReference)}>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>

                  <Button variant="outline" className="gap-2" onClick={() => openEditModal(selectedReference)}>
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

      {isRenderingMaterial && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-bold text-text-primary">Renderizando material</h3>
              <p className="text-sm font-semibold text-text-primary">
                {materialRenderStatus || 'Estamos preparando o arquivo para envio.'}
              </p>
              <p className="text-sm text-text-secondary">
                Vídeos maiores podem levar alguns minutos. Mantenha esta aba aberta.
              </p>
            </div>
            <div className="mt-5 space-y-2 text-left">
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${Math.max(1, Math.min(100, materialRenderProgress))}%` }}
                />
              </div>
              <p className="text-center text-xs font-semibold text-text-secondary">
                {Math.round(Math.max(0, Math.min(100, materialRenderProgress)))}% concluído
              </p>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary">{notice.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
              {notice.message}
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setNotice(null)}>OK</Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && referenceToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary">Excluir referência</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Tem certeza que deseja excluir <strong>{referenceToDelete.title}</strong>? Essa ação remove a referência da biblioteca deste profile.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setReferenceToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </span>
                ) : (
                  'Excluir'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
