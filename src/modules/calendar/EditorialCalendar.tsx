import * as React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { useTrialGuidedFlow } from '../onboarding/hooks/useTrialGuidedFlow';

interface CalendarPost {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  description: string | null;
  scheduledDate: Date;
  platform: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EditorialCalendarRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  description: string | null;
  scheduled_date: string;
  status: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToPost(row: EditorialCalendarRow): CalendarPost {
  return {
    id: row.id,
    user_id: row.user_id,
    profile_id: row.profile_id,
    title: row.title,
    description: row.description ?? '',
    scheduledDate: new Date(row.scheduled_date),
    platform: 'Conteúdo',
    status: row.status ?? 'Planned',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const EditorialCalendar = () => {
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  useTrialGuidedFlow();

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [posts, setPosts] = React.useState<CalendarPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
  const [newPostTitle, setNewPostTitle] = React.useState('');
  const [newPostDescription, setNewPostDescription] = React.useState('');
  const [newPostDate, setNewPostDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPostPlatform, setNewPostPlatform] = React.useState('Instagram');
  const [newPostStatus, setNewPostStatus] = React.useState('Planned');
  const [isSavingPost, setIsSavingPost] = React.useState(false);
  const [isDeletingPost, setIsDeletingPost] = React.useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const resetModalForm = React.useCallback(() => {
    setEditingPostId(null);
    setNewPostTitle('');
    setNewPostDescription('');
    setNewPostPlatform('Instagram');
    setNewPostStatus('Planned');
    setNewPostDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const loadPosts = React.useCallback(async () => {
    if (!supabase || !user?.id) {
      setPosts([]);
      return;
    }

    setIsLoadingPosts(true);
    setErrorMessage(null);

    try {
      let query = supabase
        .from('editorial_calendar')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (activeProfile?.id) {
        query = query.eq('profile_id', activeProfile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedPosts = ((data ?? []) as EditorialCalendarRow[]).map(mapRowToPost);
      setPosts(mappedPosts);
    } catch (error) {
      console.error('[EditorialCalendar] Error loading posts:', error);
      setPosts([]);
      setErrorMessage('Não foi possível carregar os posts do calendário.');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const openAddModal = (date?: Date) => {
    resetModalForm();

    if (date) {
      setNewPostDate(format(date, 'yyyy-MM-dd'));
    }

    setIsModalOpen(true);
  };

  const openEditModal = (post: CalendarPost) => {
    setEditingPostId(post.id);
    setNewPostTitle(post.title);
    setNewPostDescription(post.description || '');
    setNewPostDate(format(post.scheduledDate, 'yyyy-MM-dd'));
    setNewPostPlatform(post.platform || 'Instagram');
    setNewPostStatus(post.status);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPostTitle.trim()) return;

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

    setIsSavingPost(true);
    setErrorMessage(null);

    const scheduledDateIso = new Date(`${newPostDate}T12:00:00`).toISOString();

    const payload = {
      user_id: user.id,
      profile_id: activeProfile.id,
      title: newPostTitle.trim(),
      description: newPostDescription.trim() || null,
      scheduled_date: scheduledDateIso,
      status: newPostStatus,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingPostId) {
        const { data, error } = await supabase
          .from('editorial_calendar')
          .update(payload)
          .eq('id', editingPostId)
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .select('*')
          .single();

        if (error) throw error;

        const updatedPost = mapRowToPost(data as EditorialCalendarRow);
        updatedPost.platform = newPostPlatform;

        setPosts((prev) =>
          prev.map((post) => (post.id === editingPostId ? updatedPost : post))
        );
      } else {
        const { data, error } = await supabase
          .from('editorial_calendar')
          .insert([
            {
              ...payload,
              created_at: new Date().toISOString(),
            },
          ])
          .select('*')
          .single();

        if (error) throw error;

        const createdPost = mapRowToPost(data as EditorialCalendarRow);
        createdPost.platform = newPostPlatform;

        setPosts((prev) =>
          [...prev, createdPost].sort(
            (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
          )
        );
      }

      setIsModalOpen(false);
      resetModalForm();
    } catch (error: any) {
      console.error('[EditorialCalendar] Error saving post:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar o post.');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!editingPostId) return;

    if (!supabase || !user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    setIsDeletingPost(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('editorial_calendar')
        .delete()
        .eq('id', editingPostId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPosts((prev) => prev.filter((post) => post.id !== editingPostId));
      setIsModalOpen(false);
      resetModalForm();
    } catch (error: any) {
      console.error('[EditorialCalendar] Error deleting post:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir o post.');
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('postId', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();

    const postId = e.dataTransfer.getData('postId');
    if (!postId) return;

    if (!supabase || !user?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    const updatedScheduledDateIso = new Date(
      `${format(targetDate, 'yyyy-MM-dd')}T12:00:00`
    ).toISOString();

    const previousPosts = posts;

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              scheduledDate: new Date(updatedScheduledDateIso),
              updatedAt: new Date(),
            }
          : post
      )
    );

    try {
      const { data, error } = await supabase
        .from('editorial_calendar')
        .update({
          scheduled_date: updatedScheduledDateIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      const oldPost = previousPosts.find((post) => post.id === postId);
      const updatedPost = mapRowToPost(data as EditorialCalendarRow);
      updatedPost.platform = oldPost?.platform || 'Conteúdo';

      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? updatedPost : post))
      );
    } catch (error: any) {
      console.error('[EditorialCalendar] Error moving post:', error);
      setPosts(previousPosts);
      setErrorMessage(error?.message || 'Não foi possível mover o post.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-brand" />
            Calendário Editorial
          </h1>
          <p className="text-text-secondary">Planeje e visualize sua agenda de conteúdo.</p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button className="gap-2" onClick={() => openAddModal()} data-tour-id="calendar-add-button">
            <Plus className="h-4 w-4" />
            Agendar Post
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-text-primary">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-bold uppercase tracking-wider text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {isLoadingPosts ? (
          <div className="p-10 text-center text-text-secondary">
            Carregando calendário...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayPosts = posts.filter((post) => isSameDay(post.scheduledDate, day));
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div
                  key={idx}
                  onClick={() => openAddModal(day)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => void handleDrop(e, day)}
                  className={cn(
                    'min-h-[120px] border-b border-r border-gray-100 p-2 transition-colors hover:bg-gray-50/50 group cursor-pointer',
                    !isCurrentMonth && 'bg-gray-50/30'
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium',
                        isSameDay(day, new Date())
                          ? 'bg-brand text-white'
                          : isCurrentMonth
                          ? 'text-text-primary'
                          : 'text-gray-300'
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModal(day);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-brand transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(post);
                        }}
                        className="group/post relative rounded border border-gray-100 bg-white p-1.5 shadow-sm transition-all hover:border-brand hover:shadow-md cursor-pointer active:cursor-grabbing"
                      >
                        <p className="truncate text-[10px] font-bold text-text-primary leading-tight">
                          {post.title}
                        </p>

                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[8px] text-text-secondary">
                            {post.platform || 'Conteúdo'}
                          </span>
                          <div
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              post.status === 'Published'
                                ? 'bg-green-500'
                                : post.status === 'Review'
                                ? 'bg-yellow-500'
                                : 'bg-brand'
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPostId ? 'Editar Post' : 'Agendar Post'}
      >
        <form onSubmit={(e) => void handleSavePost(e)} className="space-y-4">
          <Input
            label="Título do Post"
            placeholder="Sobre o que é este post?"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Descrição</label>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 min-h-[80px] resize-y"
              placeholder="Adicione observações ou uma descrição..."
              value={newPostDescription}
              onChange={(e) => setNewPostDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Data</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={newPostDate}
                onChange={(e) => setNewPostDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Plataforma</label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                value={newPostPlatform}
                onChange={(e) => setNewPostPlatform(e.target.value)}
              >
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter</option>
                <option value="YouTube">YouTube</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Status</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              value={newPostStatus}
              onChange={(e) => setNewPostStatus(e.target.value)}
            >
              <option value="Draft">Rascunho</option>
              <option value="Planned">Planejado</option>
              <option value="Review">Revisão</option>
              <option value="Published">Publicado</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            {editingPostId ? (
              <Button
                variant="secondary"
                onClick={() => void handleDeletePost()}
                type="button"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                isLoading={isDeletingPost}
              >
                Excluir
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSavingPost} data-tour-id="calendar-save-button">
                {editingPostId ? 'Salvar Alterações' : 'Agendar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
