import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Tag,
  Edit,
  Trash,
} from 'lucide-react';

import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/EmptyState';
import { Modal } from '../../shared/components/Modal';
import { Dropdown, DropdownItem } from '../../shared/components/Dropdown';
import { useApp } from '../../app/context/AppContext';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { useTrialGuidedFlow } from '../onboarding/hooks/useTrialGuidedFlow';

interface Idea {
  id: string;
  user_id: string;
  profile_id: string;
  title: string;
  type: string;
  content: string;
  description: string;
  tags: string[];
  priority: string;
  status: string;
  objective: string;
  target_audience: string;
  style: string;
  destination: string | null;
  reference_url: string | null;
  formats: string[];
  target_platforms: string[];
  created_at?: string;
  updated_at?: string;
}

export const IdeasBank = () => {
  const navigate = useNavigate();
  const { setActiveModule } = useApp();
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  useTrialGuidedFlow();

  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingIdea, setEditingIdea] = React.useState<Idea | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [newIdeaTitle, setNewIdeaTitle] = React.useState('');
  const [newIdeaTags, setNewIdeaTags] = React.useState('');
  const [newIdeaPriority, setNewIdeaPriority] = React.useState('Medium');
  const [newIdeaStatus, setNewIdeaStatus] = React.useState('Backlog');

  const [filterPriority, setFilterPriority] = React.useState<string | null>(null);
  const [filterTag, setFilterTag] = React.useState<string | null>(null);

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
    type: idea.type ?? 'note',
    content: idea.content ?? '',
    description: idea.description ?? '',
    tags: normalizeStringArray(idea.tags),
    priority: idea.priority ?? 'Medium',
    status: idea.status ?? 'Backlog',
    objective: idea.objective ?? '',
    target_audience: idea.target_audience ?? '',
    style: idea.style ?? '',
    destination: idea.destination ?? null,
    reference_url: idea.reference_url ?? null,
    formats: normalizeStringArray(idea.formats),
    target_platforms: normalizeStringArray(idea.target_platforms),
    created_at: idea.created_at,
    updated_at: idea.updated_at,
  });

  const resetForm = () => {
    setEditingIdea(null);
    setNewIdeaTitle('');
    setNewIdeaTags('');
    setNewIdeaPriority('Medium');
    setNewIdeaStatus('Backlog');
  };

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
      console.error('[Ideas] Error loading ideas:', error);
      setIdeas([]);
      setErrorMessage('Não foi possível carregar as ideias deste perfil.');
    } finally {
      setIsLoadingIdeas(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = filterPriority ? idea.priority === filterPriority : true;
    const matchesTag = filterTag ? idea.tags.includes(filterTag) : true;

    return matchesSearch && matchesPriority && matchesTag;
  });

  const allTags = Array.from(new Set<string>(ideas.flatMap((idea) => idea.tags)));

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (idea: Idea) => {
    setEditingIdea(idea);
    setNewIdeaTitle(idea.title);
    setNewIdeaTags(idea.tags.join(', '));
    setNewIdeaPriority(idea.priority);
    setNewIdeaStatus(idea.status);
    setIsModalOpen(true);
  };

  const handleSaveIdea = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (!newIdeaTitle.trim()) {
      setErrorMessage('O título da ideia é obrigatório.');
      return;
    }

    const tagsArray = newIdeaTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    setErrorMessage(null);

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

    console.log('[Ideas] Saving payload:', payload);

    try {
      if (editingIdea) {
        const { data, error } = await supabase
          .from('ideas')
          .update({
            title: newIdeaTitle.trim(),
            content: newIdeaTitle.trim(),
            tags: tagsArray,
            priority: newIdeaPriority,
            status: newIdeaStatus,
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

      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('[Ideas] Error saving idea:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar a ideia.');
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!supabase) {
      setErrorMessage('Supabase não está configurado.');
      return;
    }

    if (!activeProfile?.id) {
      setErrorMessage('Nenhum perfil ativo selecionado.');
      return;
    }

    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id)
        .eq('profile_id', activeProfile.id);

      if (error) throw error;

      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
    } catch (error: any) {
      console.error('[Ideas] Error deleting idea:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir a ideia.');
    }
  };

  const handleConvertToScript = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModule('scripts');
    navigate('/workspace/scripts');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-brand" />
            Banco de Ideias
          </h1>
          <p className="text-text-secondary">
            Armazene e organize suas inspirações de conteúdo.
          </p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <Button className="gap-2" onClick={openCreateModal} data-tour-id="ideas-add-button">
          <Plus className="h-4 w-4" />
          Nova Ideia
        </Button>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ideias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Dropdown
            trigger={
              <Button variant="secondary" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {filterPriority ? `Prioridade: ${filterPriority}` : 'Filtrar'}
              </Button>
            }
          >
            <DropdownItem onClick={() => setFilterPriority(null)}>
              Todas as Prioridades
            </DropdownItem>
            <DropdownItem onClick={() => setFilterPriority('High')}>
              Prioridade Alta
            </DropdownItem>
            <DropdownItem onClick={() => setFilterPriority('Medium')}>
              Prioridade Média
            </DropdownItem>
            <DropdownItem onClick={() => setFilterPriority('Low')}>
              Prioridade Baixa
            </DropdownItem>
          </Dropdown>

          <Dropdown
            trigger={
              <Button variant="secondary" size="sm" className="gap-2">
                <Tag className="h-4 w-4" />
                {filterTag ? `#${filterTag}` : 'Tags'}
              </Button>
            }
          >
            <DropdownItem onClick={() => setFilterTag(null)}>Todas as Tags</DropdownItem>
            {allTags.map((tag) => (
              <DropdownItem key={tag} onClick={() => setFilterTag(tag)}>
                #{tag}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>

      {isLoadingIdeas ? (
        <Card className="flex items-center justify-center py-20">
          <p className="text-text-secondary">Carregando ideias...</p>
        </Card>
      ) : filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.map((idea) => (
            <Card
              key={idea.id}
              className="group hover:border-brand transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <Badge
                  variant={
                    idea.priority === 'High'
                      ? 'error'
                      : idea.priority === 'Medium'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {idea.priority === 'High'
                    ? 'Prioridade Alta'
                    : idea.priority === 'Medium'
                    ? 'Prioridade Média'
                    : 'Prioridade Baixa'}
                </Badge>

                <Dropdown
                  trigger={
                    <button className="text-gray-400 hover:text-text-primary p-1 rounded-md hover:bg-gray-100 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownItem icon={Edit} onClick={() => openEditModal(idea)}>
                    Editar Ideia
                  </DropdownItem>
                  <DropdownItem
                    icon={Trash}
                    onClick={() => handleDeleteIdea(idea.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Excluir Ideia
                  </DropdownItem>
                </Dropdown>
              </div>

              <h3 className="text-lg font-bold text-text-primary mb-3 group-hover:text-brand transition-colors">
                {idea.title}
              </h3>

              <div className="flex flex-wrap gap-2 mb-4">
                {idea.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-text-secondary">
                  Status: {idea.status}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleConvertToScript}
                >
                  Converter em Roteiro
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex items-center justify-center py-20">
          <EmptyState
            title="Nenhuma ideia encontrada"
            description="Tente ajustar sua busca ou adicione uma nova inspiração ao seu banco."
            icon={Lightbulb}
            action={
              <Button onClick={openCreateModal} data-tour-id="ideas-add-button">
                Adicionar Nova Ideia
              </Button>
            }
          />
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIdea ? 'Editar Ideia' : 'Adicionar Nova Ideia'}
      >
        <form onSubmit={handleSaveIdea} className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              {editingIdea ? 'Atualize os detalhes da ideia' : 'Crie uma nova ideia'}
            </h3>
            <p className="text-sm text-text-secondary">
              Organize sua inspiração e prepare-a para futuras produções de conteúdo.
            </p>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-text-primary">
                  Informações do conteúdo
                </h4>
                <p className="text-xs text-text-secondary">
                  Defina a ideia principal e as tags que ajudam a categorizá-la.
                </p>
              </div>

              <Input
                label="Título da Ideia"
                placeholder="Sobre o que é sua ideia?"
                value={newIdeaTitle}
                onChange={(e) => setNewIdeaTitle(e.target.value)}
                required
              />

              <Input
                label="Tags"
                placeholder="Ex.: vlog, dicas, educativo"
                value={newIdeaTags}
                onChange={(e) => setNewIdeaTags(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-text-primary">
                  Configurações do fluxo
                </h4>
                <p className="text-xs text-text-secondary">
                  Defina a prioridade e o estágio atual desta ideia.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Prioridade
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    value={newIdeaPriority}
                    onChange={(e) => setNewIdeaPriority(e.target.value)}
                  >
                    <option value="Low">Baixa</option>
                    <option value="Medium">Média</option>
                    <option value="High">Alta</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Status
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    value={newIdeaStatus}
                    onChange={(e) => setNewIdeaStatus(e.target.value)}
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="Planned">Planejada</option>
                    <option value="Drafting">Em Rascunho</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Cancelar
            </Button>
            <Button type="submit" data-tour-id="ideas-save-button">
              {editingIdea ? 'Salvar Alterações' : 'Salvar Ideia'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
