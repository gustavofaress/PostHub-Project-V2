import * as React from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Pencil,
} from 'lucide-react';

import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';

import { useProfile } from '../../app/context/ProfileContext';
import { referencesService } from '../../services/references.service';
import type { ReferenceItem, ReferenceType } from '../../types/reference.types';

type CreateTab = 'link' | 'image' | 'video' | 'screen_recording';

interface FormState {
  title: string;
  description: string;
  sourceUrl: string;
  tags: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  sourceUrl: '',
  tags: '',
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

  const [references, setReferences] = React.useState<ReferenceItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState('');

  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferenceItem | null>(null);

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [activeTab, setActiveTab] = React.useState<CreateTab>('link');
  const [file, setFile] = React.useState<File | null>(null);

  // 🔥 LOAD DATA
  const loadReferences = async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const data = await referencesService.listByProfile(profileId);
      setReferences(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadReferences();
  }, [profileId]);

  // 🔥 CREATE / UPDATE
  const handleSave = async () => {
    if (!profileId || !form.title.trim()) return;

    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      if (editing) {
        await referencesService.update({
          id: editing.id,
          title: form.title,
          description: form.description,
          tags,
        });
      } else {
        if (activeTab === 'link') {
          await referencesService.create({
            profile_id: profileId,
            title: form.title,
            description: form.description,
            type: 'link',
            source: inferPlatformFromUrl(form.sourceUrl),
            source_url: form.sourceUrl,
            tags,
          });
        } else if (file) {
          const upload = await referencesService.uploadFile(profileId, file);

          await referencesService.create({
            profile_id: profileId,
            title: form.title,
            description: form.description,
            type: activeTab as ReferenceType,
            source: 'Upload',
            file_url: upload.fileUrl,
            thumbnail_url: upload.fileUrl,
            file_name: upload.fileName,
            file_size_mb: upload.fileSizeMb,
            tags,
          });
        }
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      setFile(null);

      await loadReferences();
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 DELETE
  const handleDelete = async (id: string) => {
    try {
      await referencesService.remove(id);
      await loadReferences();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = references.filter((r) =>
    [r.title, r.description, ...(r.tags || [])]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Carregando referências...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex gap-2 items-center">
          <BookOpen /> Banco de Referências
        </h1>

        <Button onClick={() => setShowModal(true)}>
          <Plus /> Nova
        </Button>
      </div>

      {/* SEARCH */}
      <Input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((ref) => (
          <Card key={ref.id} className="p-4 space-y-2">
            <h3 className="font-bold">{ref.title}</h3>
            <p className="text-sm text-gray-500">{ref.description}</p>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => {
                setEditing(ref);
                setForm({
                  title: ref.title,
                  description: ref.description,
                  sourceUrl: ref.source_url || '',
                  tags: (ref.tags || []).join(', ')
                });
                setShowModal(true);
              }}>
                <Pencil size={16} />
              </Button>

              <Button size="sm" onClick={() => handleDelete(ref.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 w-[400px] space-y-4">
            <h2 className="font-bold">Nova referência</h2>

            <Input
              placeholder="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              className="w-full border rounded p-2"
              placeholder="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <Input
              placeholder="Tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />

            {/* LINK */}
            {activeTab === 'link' && (
              <Input
                placeholder="URL"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              />
            )}

            {/* UPLOAD */}
            {activeTab !== 'link' && (
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
