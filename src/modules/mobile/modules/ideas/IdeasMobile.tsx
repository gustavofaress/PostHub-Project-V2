import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Lightbulb, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../../../../app/context/AppContext';
import { useAuth } from '../../../../app/context/AuthContext';
import { useProfile } from '../../../../app/context/ProfileContext';
import { useWorkspacePermissions } from '../../../../hooks/useWorkspacePermissions';
import { Badge } from '../../../../shared/components/Badge';
import { BottomSheet } from '../../components/BottomSheet';
import { MobilePage } from '../../components/MobilePage';
import { supabase } from '../../../../shared/utils/supabase';

interface Idea {
  id: string;
  user_id: string;
  profile_id: string;
  title: string;
  tags: string[];
  priority: string;
  status: string;
  updated_at?: string;
}

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeIdea = (idea: any): Idea => ({
  id: String(idea.id),
  user_id: String(idea.user_id),
  profile_id: String(idea.profile_id),
  title: idea.title ?? '',
  tags: normalizeStringArray(idea.tags),
  priority: idea.priority ?? 'Medium',
  status: idea.status ?? 'Backlog',
  updated_at: idea.updated_at,
});

const priorityCopy: Record<string, { label: string; variant: 'default' | 'warning' | 'error' }> = {
  Low: { label: 'Baixa', variant: 'default' },
  Medium: { label: 'Média', variant: 'warning' },
  High: { label: 'Alta', variant: 'error' },
};

export const IdeasMobile = () => {
  const navigate = useNavigate();
  const { setActiveModule } = useApp();
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const { canAccess, isLoadingPermissions } = useWorkspacePermissions();
  const canManageIdeas = canAccess('ideas');

  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingIdea, setEditingIdea] = React.useState<Idea | null>(null);
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [newIdeaTitle, setNewIdeaTitle] = React.useState('');
  const [newIdeaTags, setNewIdeaTags] = React.useState('');
  const [newIdeaPriority, setNewIdeaPriority] = React.useState('Medium');
  const [newIdeaStatus, setNewIdeaStatus] = React.useState('Backlog');
  const [isSavingIdea, setIsSavingIdea] = React.useState(false);

  const loadIdeas = React.useCallback(async () => {
    if (!supabase || !activeProfile?.id) {
      setIdeas([]);
      return;
    }

    setIsLoadingIdeas(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('profile_id', activeProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setIdeas((data ?? []).map(normalizeIdea));
    } catch (error) {
      console.error('[IdeasMobile] Failed to load ideas:', error);
      setIdeas([]);
      setErrorMessage('Nao foi possivel carregar as ideias.');
    } finally {
      setIsLoadingIdeas(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const filteredIdeas = ideas.filter((idea) => {
    const query = searchTerm.toLowerCase();
    return (
      idea.title.toLowerCase().includes(query) ||
      idea.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const resetForm = () => {
    setEditingIdea(null);
    setNewIdeaTitle('');
    setNewIdeaTags('');
    setNewIdeaPriority('Medium');
    setNewIdeaStatus('Backlog');
  };

  const openCreateSheet = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  const openEditSheet = (idea: Idea) => {
    setEditingIdea(idea);
    setNewIdeaTitle(idea.title);
    setNewIdeaTags(idea.tags.join(', '));
    setNewIdeaPriority(idea.priority);
    setNewIdeaStatus(idea.status);
    setIsSheetOpen(true);
    setActiveCardId(null);
  };

  const handleSaveIdea = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageIdeas || !user?.id || !activeProfile?.id || !supabase) {
      setErrorMessage('Seu acesso atual nao permite salvar ideias.');
      return;
    }

    if (!newIdeaTitle.trim()) {
      setErrorMessage('O titulo da ideia e obrigatorio.');
      return;
    }

    setIsSavingIdea(true);
    setErrorMessage(null);

    const tagsArray = newIdeaTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      user_id: user.id,
      profile_id: activeProfile.id,
      title: newIdeaTitle.trim(),
      type: 'note',
      content: newIdeaTitle.trim(),
      description: '',
      tags: tagsArray,
      priority: newIdeaPriority,
      status: newIdeaStatus,
      objective: '',
      target_audience: '',
      style: '',
      destination: null,
      reference_url: null,
      formats: [],
      target_platforms: [],
    };

    try {
      if (editingIdea) {
        const { data, error } = await supabase
          .from('ideas')
          .update({
            title: payload.title,
            content: payload.content,
            tags: payload.tags,
            priority: payload.priority,
            status: payload.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingIdea.id)
          .eq('profile_id', activeProfile.id)
          .select('*')
          .single();

        if (error) throw error;

        setIdeas((prev) =>
          prev.map((idea) => (idea.id === editingIdea.id ? normalizeIdea(data) : idea))
        );
      } else {
        const { data, error } = await supabase
          .from('ideas')
          .insert([payload])
          .select('*')
          .single();

        if (error) throw error;

        setIdeas((prev) => [normalizeIdea(data), ...prev]);
      }

      setIsSheetOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('[IdeasMobile] Failed to save idea:', error);
      setErrorMessage(error?.message || 'Nao foi possivel salvar a ideia.');
    } finally {
      setIsSavingIdea(false);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!canManageIdeas || !supabase || !activeProfile?.id) {
      setErrorMessage('Seu acesso atual nao permite excluir ideias.');
      return;
    }

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id)
        .eq('profile_id', activeProfile.id);

      if (error) throw error;

      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
      setActiveCardId(null);
    } catch (error: any) {
      console.error('[IdeasMobile] Failed to delete idea:', error);
      setErrorMessage(error?.message || 'Nao foi possivel excluir a ideia.');
    }
  };

  const handleConvertToScript = () => {
    setActiveModule('scripts');
    navigate('/workspace/scripts');
  };

  return (
    <>
      <MobilePage className="gap-5">
        <section className="mobile-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="brand" className="mb-3 px-3 py-1 text-[0.76rem] uppercase tracking-[0.16em]">
                Feed de ideias
              </Badge>
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-950">
                Tudo pronto para capturar rapido
              </h2>
              <p className="mt-2 text-[0.98rem] leading-7 text-slate-600">
                Pesquise, edite e empurre uma ideia para roteiro sem sair da mesma tela.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(56,182,255,0.16)_0%,rgba(56,182,255,0.08)_100%)] text-brand">
              <Lightbulb className="h-6 w-6" />
            </div>
          </div>

          <label className="mt-5 flex min-h-[54px] items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/90 px-4">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por titulo ou tag"
              className="h-12 flex-1 bg-transparent text-[1rem] text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </section>

        {!canManageIdeas && !isLoadingPermissions ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-[0.95rem] leading-6 text-amber-700">
            Voce pode consultar as ideias deste workspace, mas nao criar ou editar.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-[0.95rem] leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoadingIdeas ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="mobile-panel border-dashed px-5 py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 text-brand" />
            <p className="text-[1.05rem] font-semibold text-slate-950">
              Nenhuma ideia encontrada
            </p>
            <p className="mt-2 text-[0.98rem] leading-7 text-slate-600">
              Crie uma nova entrada para alimentar sua esteira de conteudo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIdeas.map((idea) => {
              const priority = priorityCopy[idea.priority] || priorityCopy.Medium;
              const isActive = activeCardId === idea.id;

              return (
                <div
                  key={idea.id}
                  className="mobile-panel overflow-hidden transition-transform active:scale-[0.995]"
                >
                  <button
                    type="button"
                    onClick={() => setActiveCardId(isActive ? null : idea.id)}
                    className="flex w-full items-start gap-4 px-4 py-4 text-left"
                  >
                    <div className="flex min-h-[52px] min-w-[52px] items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={priority.variant}>{priority.label}</Badge>
                        <span className="text-[0.82rem] text-slate-400">{idea.status}</span>
                      </div>
                      <p className="text-[1rem] font-semibold text-slate-950">
                        {idea.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {idea.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.78rem] font-medium text-slate-500"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>

                  {isActive ? (
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEditSheet(idea)}
                        className="flex min-h-[46px] items-center justify-center gap-2 rounded-[20px] bg-slate-100 text-[0.92rem] font-medium text-slate-700 active:scale-[0.98]"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteIdea(idea.id)}
                        className="flex min-h-[46px] items-center justify-center gap-2 rounded-[20px] bg-red-50 text-[0.92rem] font-medium text-red-600 active:scale-[0.98]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={handleConvertToScript}
                        className="col-span-2 flex min-h-[48px] items-center justify-center rounded-[20px] bg-brand text-[0.94rem] font-semibold text-white shadow-[0_10px_26px_rgba(56,182,255,0.24)] active:scale-[0.98]"
                      >
                        Transformar em roteiro
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={openCreateSheet}
          className="fixed bottom-28 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_16px_36px_rgba(56,182,255,0.38)] active:scale-[0.98] md:hidden"
          aria-label="Nova ideia"
        >
          <Plus className="h-6 w-6" />
        </button>
      </MobilePage>

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingIdea ? 'Editar ideia' : 'Nova ideia'}
      >
        <form onSubmit={handleSaveIdea} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[0.9rem] font-medium text-slate-700">
              Titulo
            </label>
            <input
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              placeholder="Sobre o que e sua ideia?"
              className="min-h-[52px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-[1rem] text-slate-900 outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[0.9rem] font-medium text-slate-700">
              Tags
            </label>
            <input
              value={newIdeaTags}
              onChange={(e) => setNewIdeaTags(e.target.value)}
              placeholder="vlog, dicas, educativo"
              className="min-h-[52px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-[1rem] text-slate-900 outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-[0.9rem] font-medium text-slate-700">
                Prioridade
              </label>
              <select
                value={newIdeaPriority}
                onChange={(e) => setNewIdeaPriority(e.target.value)}
                className="min-h-[52px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-[1rem] text-slate-900 outline-none focus:border-brand"
              >
                <option value="Low">Baixa</option>
                <option value="Medium">Media</option>
                <option value="High">Alta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[0.9rem] font-medium text-slate-700">
                Status
              </label>
              <select
                value={newIdeaStatus}
                onChange={(e) => setNewIdeaStatus(e.target.value)}
                className="min-h-[52px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-[1rem] text-slate-900 outline-none focus:border-brand"
              >
                <option value="Backlog">Backlog</option>
                <option value="Planned">Planejada</option>
                <option value="Drafting">Em rascunho</option>
              </select>
            </div>
          </div>

          <div className="sticky bottom-0 mx-[-1.25rem] border-t border-slate-200/80 bg-white/90 px-5 pb-2 pt-4 backdrop-blur-xl">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-[22px] border border-slate-200 bg-white px-4 text-[1rem] font-semibold text-slate-700 active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingIdea}
                className="flex min-h-[52px] flex-[1.15] items-center justify-center rounded-[22px] bg-brand px-4 text-[1rem] font-semibold text-white shadow-[0_10px_26px_rgba(56,182,255,0.3)] active:scale-[0.98] disabled:opacity-60"
              >
                {isSavingIdea ? 'Salvando...' : editingIdea ? 'Salvar' : 'Criar ideia'}
              </button>
            </div>
          </div>
        </form>
      </BottomSheet>
    </>
  );
};
