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
} from 'lucide-react';

import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';

import { useProfile } from '../../app/context/ProfileContext';
import {
  useReferences,
  useCreateReference,
  useUpdateReference,
  useDeleteReference,
} from '../../hooks/useReferences';

import { referencesService } from '../../services/references.service';
import type { ReferenceItem, ReferenceType } from '../../types/reference.types';

type ViewMode = 'grid' | 'list';
type CreateTab = 'link' | 'image' | 'video' | 'screen_recording';

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

const inferPlatformFromUrl = (url: string): string => {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('tiktok')) return 'TikTok';
  if (u.includes('youtube')) return 'YouTube';
  if (u.includes('linkedin')) return 'LinkedIn';
  return 'Link externo';
};

export const References = () => {
  const { activeProfile } = useProfile();
  const profileId = activeProfile?.id;

  const { data: references = [], isLoading } = useReferences(profileId);
  const createMutation = useCreateReference(profileId);
  const updateMutation = useUpdateReference(profileId);
  const deleteMutation = useDeleteReference(profileId);

  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const [selectedReference, setSelectedReference] = React.useState<ReferenceItem | null>(null);
  const [editingReference, setEditingReference] = React.useState<ReferenceItem | null>(null);

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [referenceToDelete, setReferenceToDelete] = React.useState<ReferenceItem | null>(null);

  const [activeTab, setActiveTab] = React.useState<CreateTab>('link');
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return references.filter((r) =>
      [r.title, r.description, ...(r.tags || [])].join(' ').toLowerCase().includes(q)
    );
  }, [references, search]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingReference(null);
    setSelectedFile(null);
    setActiveTab('link');
  };

  const handleSave = async () => {
    if (!profileId) return;

    const parsedTags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingReference) {
      await updateMutation.mutateAsync({
        id: editingReference.id,
        title: form.title,
        description: form.description,
        tags: parsedTags,
      });
    } else {
      if (activeTab === 'link') {
        await createMutation.mutateAsync({
          profile_id: profileId,
          title: form.title,
          description: form.description,
          type: 'link',
          source: form.source || inferPlatformFromUrl(form.sourceUrl),
          source_url: form.sourceUrl,
          tags: parsedTags,
        });
      } else if (selectedFile) {
        const upload = await referencesService.uploadFile(profileId, selectedFile);

        await createMutation.mutateAsync({
          profile_id: profileId,
          title: form.title,
          description: form.description,
          type: activeTab,
          source: 'Upload',
          file_url: upload.fileUrl,
          thumbnail_url: upload.fileUrl,
          file_name: upload.fileName,
          file_size_mb: upload.fileSizeMb,
          tags: parsedTags,
        });
      }
    }

    setShowCreateModal(false);
    resetForm();
  };

  const confirmDelete = async () => {
    if (!referenceToDelete) return;
    await deleteMutation.mutateAsync(referenceToDelete.id);
    setShowDeleteModal(false);
    setReferenceToDelete(null);
  };

  if (isLoading) {
    return <div>Carregando referências...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Banco de Referências</h1>

      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus /> Nova
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((ref) => (
          <Card key={ref.id} className="p-4">
            <h3>{ref.title}</h3>
            <p>{ref.description}</p>

            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => setEditingReference(ref)}>
                <Pencil />
              </Button>

              <Button size="sm" onClick={() => {
                setReferenceToDelete(ref);
                setShowDeleteModal(true);
              }}>
                <Trash2 />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 w-[500px] space-y-4">
            <h2>Nova referência</h2>

            <Input
              placeholder="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <Input
              placeholder="Tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />

            {activeTab !== 'link' && (
              <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 space-y-4">
            <p>Excluir referência?</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button onClick={confirmDelete}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
