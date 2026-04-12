import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Trello,
  Plus,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  Trash,
  Edit2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { Avatar } from '../../shared/components/Avatar';
import { Dropdown, DropdownItem } from '../../shared/components/Dropdown';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Tabs } from '../../shared/components/Tabs';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { useTrialGuidedFlow } from '../onboarding/hooks/useTrialGuidedFlow';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { MemberAssignmentField } from '../../shared/components/MemberAssignmentField';
import { TaskCommentsPanel } from '../../shared/components/TaskCommentsPanel';
import { workspaceCollaborationService } from '../../services/workspace-collaboration.service';
import type { WorkspaceTaskAssignment } from '../../shared/constants/workspaceCollaboration';
import {
  readWorkspaceNotificationParams,
  withoutWorkspaceNotificationParams,
} from '../../shared/constants/workspaceNotifications';

interface KanbanColumn {
  id: string;
  profile_id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface KanbanCard {
  id: string;
  user_id: string;
  profile_id: string | null;
  columnId: string | null;
  title: string;
  type: string;
  priority: string;
  scheduledDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface EditorialColumnRow {
  id: string;
  profile_id: string;
  name: string;
  position?: number | null;
  order?: number | null;
  created_at: string;
  updated_at: string;
}

interface EditorialCalendarRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  status: string | null;
  kanban_column_id: string | null;
  scheduled_date: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLUMN_NAMES = ['Planning', 'Production', 'Review', 'Published'];

function mapColumnRow(row: EditorialColumnRow): KanbanColumn {
  return {
    id: row.id,
    profile_id: row.profile_id,
    name: row.name,
    order: row.position ?? row.order ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function inferTaskType(title: string, status?: string | null): string {
  const lower = title.toLowerCase();

  if (lower.includes('video') || lower.includes('reel') || lower.includes('tiktok')) return 'Video';
  if (lower.includes('design') || lower.includes('carousel') || lower.includes('post')) return 'Design';
  if (lower.includes('script') || lower.includes('roteiro')) return 'Script';
  if (lower.includes('research') || lower.includes('pesquisa')) return 'Research';
  if (lower.includes('email') || lower.includes('newsletter')) return 'Email';

  if (status === 'Review') return 'Script';
  if (status === 'Published') return 'Design';

  return 'Video';
}

function inferPriority(status?: string | null): string {
  if (status === 'Review') return 'High';
  if (status === 'Published') return 'Low';
  if (status === 'Draft') return 'Medium';
  return 'Medium';
}

function mapCardRow(row: EditorialCalendarRow): KanbanCard {
  return {
    id: row.id,
    user_id: row.user_id,
    profile_id: row.profile_id,
    columnId: row.kanban_column_id,
    title: row.title,
    type: inferTaskType(row.title, row.status),
    priority: inferPriority(row.status),
    scheduledDate: new Date(row.scheduled_date),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapColumnNameToStatus(columnName: string): string {
  const value = columnName.trim().toLowerCase();

  if (value.includes('plan')) return 'Planned';
  if (value.includes('draft') || value.includes('prod')) return 'Draft';
  if (value.includes('review') || value.includes('rev')) return 'Review';
  if (value.includes('publish')) return 'Published';

  return 'Planned';
}

export const KanbanBoard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const { activeMembers } = useWorkspaceMembers();
  useTrialGuidedFlow();

  const [columns, setColumns] = React.useState<KanbanColumn[]>([]);
  const [cards, setCards] = React.useState<KanbanCard[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCardId, setEditingCardId] = React.useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskColumn, setNewTaskColumn] = React.useState('');
  const [newTaskType, setNewTaskType] = React.useState('Video');
  const [newTaskDate, setNewTaskDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSavingTask, setIsSavingTask] = React.useState(false);
  const [isDeletingTask, setIsDeletingTask] = React.useState(false);
  const [linkedMemberIds, setLinkedMemberIds] = React.useState<string[]>([]);
  const [taskAssignments, setTaskAssignments] = React.useState<WorkspaceTaskAssignment[]>([]);
  const [modalTab, setModalTab] = React.useState<'details' | 'comments'>('details');

  const [editingColumnId, setEditingColumnId] = React.useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = React.useState('');
  const [isSavingColumn, setIsSavingColumn] = React.useState(false);

  const loadBoard = React.useCallback(async () => {
    if (!supabase || !user?.id || !activeProfile?.id) {
      setColumns([]);
      setCards([]);
      return;
    }

    setIsLoadingBoard(true);
    setErrorMessage(null);

    try {
      const [
        { data: columnsData, error: columnsError },
        { data: cardsData, error: cardsError },
        assignmentData,
      ] = await Promise.all([
        supabase
          .from('editorial_columns')
          .select('*')
          .eq('profile_id', activeProfile.id)
          .order('position', { ascending: true }),
        supabase
          .from('editorial_calendar')
          .select('*')
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),
        workspaceCollaborationService.listAssignments(activeProfile.id, 'editorial_calendar'),
      ]);

      if (columnsError) throw columnsError;
      if (cardsError) throw cardsError;

      let mappedColumns = ((columnsData ?? []) as EditorialColumnRow[])
        .map(mapColumnRow)
        .sort((a, b) => a.order - b.order);

      if (mappedColumns.length === 0) {
        const now = new Date().toISOString();
        const { data: createdColumns, error: createColumnsError } = await supabase
          .from('editorial_columns')
          .insert(
            DEFAULT_COLUMN_NAMES.map((name, index) => ({
              profile_id: activeProfile.id,
              name,
              position: index,
              created_at: now,
              updated_at: now,
            }))
          )
          .select('*');

        if (createColumnsError) throw createColumnsError;

        mappedColumns = ((createdColumns ?? []) as EditorialColumnRow[])
          .map(mapColumnRow)
          .sort((a, b) => a.order - b.order);
      }

      const fallbackColumnId = mappedColumns[0]?.id ?? null;

      const mappedCards = ((cardsData ?? []) as EditorialCalendarRow[]).map((row) => {
        const mapped = mapCardRow(row);
        if (!mapped.columnId && fallbackColumnId) {
          mapped.columnId = fallbackColumnId;
        }
        return mapped;
      });

      setColumns(mappedColumns);
      setCards(mappedCards);
      setTaskAssignments(assignmentData);
    } catch (error) {
      console.error('[KanbanBoard] Error loading board:', error);
      setColumns([]);
      setCards([]);
      setTaskAssignments([]);
      setErrorMessage('Não foi possível carregar o Kanban deste perfil.');
    } finally {
      setIsLoadingBoard(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const handleAddColumn = async () => {
    if (!supabase || !activeProfile?.id) {
      setErrorMessage('Nenhum perfil ativo selecionado.');
      return;
    }

    setErrorMessage(null);
    setIsSavingColumn(true);

    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('editorial_columns')
        .insert([
          {
            profile_id: activeProfile.id,
            name: 'Nova Coluna',
            position: columns.length,
            created_at: now,
            updated_at: now,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      const newColumn = mapColumnRow(data as EditorialColumnRow);
      setColumns((prev) => [...prev, newColumn].sort((a, b) => a.order - b.order));
    } catch (error: any) {
      console.error('[KanbanBoard] Error adding column:', error);
      setErrorMessage(error?.message || 'Não foi possível criar a coluna.');
    } finally {
      setIsSavingColumn(false);
    }
  };

  const persistColumnOrder = async (updatedColumns: KanbanColumn[]) => {
    if (!supabase) return;

    try {
      await Promise.all(
        updatedColumns.map((col, idx) =>
          supabase
            .from('editorial_columns')
            .update({
              position: idx,
              updated_at: new Date().toISOString(),
            })
            .eq('id', col.id)
        )
      );
    } catch (error) {
      console.error('[KanbanBoard] Error persisting column order:', error);
      setErrorMessage('Não foi possível persistir a ordem das colunas.');
    }
  };

  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingColumnId(null);
      return;
    }

    if (!supabase) {
      setEditingColumnId(null);
      return;
    }

    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('editorial_columns')
        .update({
          name: newName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', columnId)
        .select('*')
        .single();

      if (error) throw error;

      const updatedColumn = mapColumnRow(data as EditorialColumnRow);

      setColumns((prev) =>
        prev.map((col) => (col.id === columnId ? updatedColumn : col))
      );
      setEditingColumnId(null);
    } catch (error: any) {
      console.error('[KanbanBoard] Error renaming column:', error);
      setErrorMessage(error?.message || 'Não foi possível renomear a coluna.');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const hasCards = cards.some((c) => c.columnId === columnId);
    if (hasCards) {
      alert('Não é possível excluir uma coluna com cards. Mova ou exclua os cards primeiro.');
      return;
    }

    if (!supabase) return;

    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('editorial_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      const newColumns = columns
        .filter((col) => col.id !== columnId)
        .map((col, idx) => ({ ...col, order: idx }));

      setColumns(newColumns);
      await persistColumnOrder(newColumns);
    } catch (error: any) {
      console.error('[KanbanBoard] Error deleting column:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir a coluna.');
    }
  };

  const moveColumn = async (columnId: string, direction: 'left' | 'right') => {
    const currentIndex = columns.findIndex((c) => c.id === columnId);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= columns.length) return;

    const newColumns = [...columns];
    const temp = newColumns[currentIndex];
    newColumns[currentIndex] = newColumns[newIndex];
    newColumns[newIndex] = temp;

    const reordered = newColumns.map((col, idx) => ({ ...col, order: idx }));
    setColumns(reordered);
    await persistColumnOrder(reordered);
  };

  const moveTask = async (taskId: string, direction: 'left' | 'right') => {
    const task = cards.find((card) => card.id === taskId);
    if (!task) return;

    const currentIndex = columns.findIndex((c) => c.id === task.columnId);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= columns.length) return;

    const targetColumn = columns[newIndex];
    const previousCards = cards;

    setCards((prev) =>
      prev.map((card) =>
        card.id === taskId
          ? { ...card, columnId: targetColumn.id, updatedAt: new Date() }
          : card
      )
    );

    try {
      const { data, error } = await supabase
        .from('editorial_calendar')
        .update({
          kanban_column_id: targetColumn.id,
          status: mapColumnNameToStatus(targetColumn.name),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('profile_id', activeProfile?.id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedCard = mapCardRow(data as EditorialCalendarRow);
      setCards((prev) =>
        prev.map((card) => (card.id === taskId ? updatedCard : card))
      );
    } catch (error: any) {
      console.error('[KanbanBoard] Error moving task:', error);
      setCards(previousCards);
      setErrorMessage(error?.message || 'Não foi possível mover a tarefa.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!supabase || !activeProfile?.id) {
      setErrorMessage('Usuário não autenticado.');
      return;
    }

    setIsDeletingTask(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('editorial_calendar')
        .delete()
        .eq('id', taskId)
        .eq('profile_id', activeProfile.id);

      if (error) throw error;

      setCards((prev) => prev.filter((t) => t.id !== taskId));
      await workspaceCollaborationService.setAssignedMembers(
        activeProfile.id,
        'editorial_calendar',
        taskId,
        []
      );
      setTaskAssignments((prev) =>
        prev.filter((assignment) => assignment.entityId !== taskId)
      );
    } catch (error: any) {
      console.error('[KanbanBoard] Error deleting task:', error);
      setErrorMessage(error?.message || 'Não foi possível excluir a tarefa.');
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (!supabase || !user?.id || !activeProfile?.id) {
      setErrorMessage('Usuário não autenticado ou perfil não selecionado.');
      return;
    }

    setIsSavingTask(true);
    setErrorMessage(null);

    const selectedColumn = columns.find((col) => col.id === newTaskColumn);
    const now = new Date().toISOString();
    const scheduledDateIso = new Date(`${newTaskDate}T12:00:00`).toISOString();

    const payload = {
      user_id: user.id,
      profile_id: activeProfile.id,
      title: newTaskTitle.trim(),
      status: selectedColumn ? mapColumnNameToStatus(selectedColumn.name) : 'Planned',
      kanban_column_id: newTaskColumn || null,
      scheduled_date: scheduledDateIso,
      updated_at: now,
    };

    try {
      if (editingCardId) {
        const { data, error } = await supabase
          .from('editorial_calendar')
          .update(payload)
          .eq('id', editingCardId)
          .eq('profile_id', activeProfile.id)
          .select('*')
          .single();

        if (error) throw error;

        let updatedCard = mapCardRow(data as EditorialCalendarRow);
        updatedCard = { ...updatedCard, type: newTaskType };
        await workspaceCollaborationService.setAssignedMembers(
          activeProfile.id,
          'editorial_calendar',
          updatedCard.id,
          linkedMemberIds,
          {
            actorUserId: user?.id,
            actorName: user?.name || 'Equipe',
            members: activeMembers,
            entityTitle: updatedCard.title,
            targetModule: 'kanban',
          }
        );

        setCards((prev) =>
          prev.map((card) => (card.id === editingCardId ? updatedCard : card))
        );
      } else {
        const { data, error } = await supabase
          .from('editorial_calendar')
          .insert([
            {
              ...payload,
              created_at: now,
            },
          ])
          .select('*')
          .single();

        if (error) throw error;

        let createdCard = mapCardRow(data as EditorialCalendarRow);
        createdCard = { ...createdCard, type: newTaskType };
        await workspaceCollaborationService.setAssignedMembers(
          activeProfile.id,
          'editorial_calendar',
          createdCard.id,
          linkedMemberIds,
          {
            actorUserId: user?.id,
            actorName: user?.name || 'Equipe',
            members: activeMembers,
            entityTitle: createdCard.title,
            targetModule: 'kanban',
          }
        );

        setCards((prev) => [createdCard, ...prev]);
      }

      const nextAssignments = await workspaceCollaborationService.listAssignments(
        activeProfile.id,
        'editorial_calendar'
      );
      setTaskAssignments(nextAssignments);

      setIsModalOpen(false);
      setNewTaskTitle('');
      setNewTaskType('Video');
      setNewTaskDate(format(new Date(), 'yyyy-MM-dd'));
      setEditingCardId(null);
      setLinkedMemberIds([]);
      setModalTab('details');
    } catch (error: any) {
      console.error('[KanbanBoard] Error saving task:', error);
      setErrorMessage(error?.message || 'Não foi possível salvar a tarefa.');
    } finally {
      setIsSavingTask(false);
    }
  };

  const openAddModal = (columnId?: string) => {
    setEditingCardId(null);
    setNewTaskTitle('');
    setNewTaskType('Video');
    setNewTaskDate(format(new Date(), 'yyyy-MM-dd'));
    setNewTaskColumn(columnId || (columns.length > 0 ? columns[0].id : ''));
    setLinkedMemberIds([]);
    setModalTab('details');
    setIsModalOpen(true);
  };

  const openEditModal = React.useCallback((card: KanbanCard, nextTab: 'details' | 'comments' = 'details') => {
    setEditingCardId(card.id);
    setNewTaskTitle(card.title);
    setNewTaskColumn(card.columnId || (columns[0]?.id ?? ''));
    setNewTaskType(card.type);
    setNewTaskDate(format(card.scheduledDate, 'yyyy-MM-dd'));
    setLinkedMemberIds(
      taskAssignments
        .filter((assignment) => assignment.entityType === 'editorial_calendar' && assignment.entityId === card.id)
        .map((assignment) => assignment.memberId)
    );
    setModalTab(nextTab);
    setIsModalOpen(true);
  }, [columns, taskAssignments]);

  React.useEffect(() => {
    const notification = readWorkspaceNotificationParams(searchParams);

    if (notification.entityType !== 'editorial_calendar' || !notification.entityId) {
      return;
    }

    const matchedCard = cards.find((card) => card.id === notification.entityId);
    if (!matchedCard) return;

    setSearchParams(withoutWorkspaceNotificationParams(searchParams));
    openEditModal(matchedCard, notification.tab === 'comments' ? 'comments' : 'details');
  }, [cards, openEditModal, searchParams, setSearchParams]);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();

    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;

    const targetColumn = columns.find((col) => col.id === columnId);
    if (!targetColumn) return;

    const previousCards = cards;

    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId ? { ...card, columnId, updatedAt: new Date() } : card
      )
    );

    try {
      const { data, error } = await supabase
        .from('editorial_calendar')
        .update({
          kanban_column_id: columnId,
          status: mapColumnNameToStatus(targetColumn.name),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cardId)
        .eq('profile_id', activeProfile?.id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedCard = mapCardRow(data as EditorialCalendarRow);

      setCards((prevCards) =>
        prevCards.map((card) => (card.id === cardId ? updatedCard : card))
      );
    } catch (error: any) {
      console.error('[KanbanBoard] Error dropping task:', error);
      setCards(previousCards);
      setErrorMessage(error?.message || 'Não foi possível mover a tarefa.');
    }
  };

  return (
    <div className="space-y-8 h-[calc(100vh-160px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Trello className="h-6 w-6 text-brand" />
            Kanban Editorial
          </h1>
          <p className="text-text-secondary">Gerencie seu fluxo de produção de conteúdo.</p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => void handleAddColumn()}
            isLoading={isSavingColumn}
          >
            <Plus className="h-4 w-4" />
            Adicionar Coluna
          </Button>
          <Button
            className="gap-2"
            onClick={() => openAddModal()}
            disabled={columns.length === 0}
            data-tour-id="kanban-add-button"
          >
            <Plus className="h-4 w-4" />
            Adicionar Tarefa
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      {isLoadingBoard ? (
        <Card className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary">Carregando Kanban...</p>
        </Card>
      ) : (
        <div className="posthub-scrollbar posthub-scrollbar-thin flex-1 flex gap-6 overflow-x-auto pb-4 pr-2">
          {columns.map((column, colIdx) => (
            <div
              key={column.id}
              className="flex flex-col w-80 shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => void handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  {editingColumnId === column.id ? (
                    <input
                      autoFocus
                      className="font-bold text-text-primary uppercase text-xs tracking-wider bg-transparent border-b border-brand focus:outline-none w-full"
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      onBlur={() => void handleRenameColumn(column.id, editingColumnName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleRenameColumn(column.id, editingColumnName);
                        if (e.key === 'Escape') setEditingColumnId(null);
                      }}
                    />
                  ) : (
                    <h3
                      className="font-bold text-text-primary uppercase text-xs tracking-wider cursor-pointer hover:text-brand"
                      onClick={() => {
                        setEditingColumnId(column.id);
                        setEditingColumnName(column.name);
                      }}
                      title="Clique para renomear"
                    >
                      {column.name}
                    </h3>
                  )}
                  <Badge variant="default" className="ml-1">
                    {cards.filter((t) => t.columnId === column.id).length}
                  </Badge>
                </div>

                <Dropdown
                  trigger={
                    <button className="text-gray-400 hover:text-text-primary p-1 rounded hover:bg-gray-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownItem icon={Plus} onClick={() => openAddModal(column.id)}>
                    Adicionar Card
                  </DropdownItem>

                  {colIdx > 0 && (
                    <DropdownItem icon={ArrowLeft} onClick={() => void moveColumn(column.id, 'left')}>
                      Mover Coluna para a Esquerda
                    </DropdownItem>
                  )}

                  {colIdx < columns.length - 1 && (
                    <DropdownItem icon={ArrowRight} onClick={() => void moveColumn(column.id, 'right')}>
                      Mover Coluna para a Direita
                    </DropdownItem>
                  )}

                  <DropdownItem
                    icon={Trash}
                    onClick={() => void handleDeleteColumn(column.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Excluir Coluna
                  </DropdownItem>
                </Dropdown>
              </div>

              <div className="posthub-scrollbar posthub-scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-xl bg-gray-100/50 p-3 pr-2">
                {cards
                  .filter((t) => t.columnId === column.id)
                  .map((task) => (
                    <Card
                      key={task.id}
                      padding="sm"
                      className="group hover:border-brand transition-all cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e: React.DragEvent) => handleDragStart(e, task.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge
                          variant={task.priority === 'High' ? 'error' : 'default'}
                          className="text-[10px]"
                        >
                          {task.priority === 'High'
                            ? 'Alta'
                            : task.priority === 'Medium'
                            ? 'Média'
                            : 'Baixa'}
                        </Badge>

                        <Dropdown
                          trigger={
                            <button className="text-gray-300 group-hover:text-gray-400 p-1 rounded hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          }
                        >
                          <DropdownItem icon={Edit2} onClick={() => openEditModal(task)}>
                            Editar Tarefa
                          </DropdownItem>

                          {colIdx > 0 && (
                            <DropdownItem icon={ArrowLeft} onClick={() => void moveTask(task.id, 'left')}>
                              Mover para a Esquerda
                            </DropdownItem>
                          )}

                          {colIdx < columns.length - 1 && (
                            <DropdownItem icon={ArrowRight} onClick={() => void moveTask(task.id, 'right')}>
                              Mover para a Direita
                            </DropdownItem>
                          )}

                          <DropdownItem
                            icon={Trash}
                            onClick={() => void deleteTask(task.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            Excluir Tarefa
                          </DropdownItem>
                        </Dropdown>
                      </div>

                      <h4 className="text-sm font-semibold text-text-primary mb-3">{task.title}</h4>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded">
                          {task.type === 'Video'
                            ? 'Vídeo'
                            : task.type === 'Design'
                            ? 'Design'
                            : task.type === 'Script'
                            ? 'Roteiro'
                            : task.type === 'Research'
                            ? 'Pesquisa'
                            : task.type === 'Email'
                            ? 'E-mail'
                            : task.type}
                        </span>
                        {taskAssignments.some(
                          (assignment) =>
                            assignment.entityType === 'editorial_calendar' &&
                            assignment.entityId === task.id
                        ) ? (
                          <Badge variant="brand" className="px-2 py-0.5 text-[10px]">
                            {
                              taskAssignments.filter(
                                (assignment) =>
                                  assignment.entityType === 'editorial_calendar' &&
                                  assignment.entityId === task.id
                              ).length
                            }{' '}
                            membro(s)
                          </Badge>
                        ) : (
                          <Avatar fallback="Usuário" size="sm" className="h-6 w-6" />
                        )}
                      </div>
                    </Card>
                  ))}

                <button
                  onClick={() => openAddModal(column.id)}
                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-brand hover:text-brand transition-all"
                >
                  + Adicionar Card
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCardId ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
        className="max-w-3xl"
      >
        <form onSubmit={(e) => void handleSaveTask(e)} className="space-y-4">
          <Tabs
            tabs={[
              { id: 'details', label: 'Detalhes' },
              { id: 'comments', label: 'Comentários' },
            ]}
            activeTab={modalTab}
            onChange={(value) => setModalTab(value as 'details' | 'comments')}
          />

          {modalTab === 'details' ? (
            <div className="space-y-4">
              <Input
                label="Título da Tarefa"
                placeholder="O que precisa ser feito?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Tipo</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                  >
                    <option value="Video">Vídeo</option>
                    <option value="Design">Design</option>
                    <option value="Script">Roteiro</option>
                    <option value="Research">Pesquisa</option>
                    <option value="Email">E-mail</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Coluna</label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  value={newTaskColumn}
                  onChange={(e) => setNewTaskColumn(e.target.value)}
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>

              <MemberAssignmentField
                members={activeMembers}
                value={linkedMemberIds}
                onChange={setLinkedMemberIds}
              />
            </div>
          ) : (
            <TaskCommentsPanel
              profileId={activeProfile?.id}
              entityType="editorial_calendar"
              entityId={editingCardId}
              currentUserName={user?.name || 'Equipe'}
              currentUserId={user?.id}
              members={activeMembers}
              assignedMemberIds={linkedMemberIds}
              entityTitle={newTaskTitle}
              targetModule="kanban"
            />
          )}

          <div className="flex justify-between pt-4">
            {editingCardId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  void deleteTask(editingCardId);
                  setIsModalOpen(false);
                }}
                type="button"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                isLoading={isDeletingTask}
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
              <Button type="submit" isLoading={isSavingTask} data-tour-id="kanban-save-button">
                {editingCardId ? 'Salvar Alterações' : 'Adicionar Tarefa'}
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
