import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../app/context/AppContext';
import { useAuth } from '../../app/context/AuthContext';
import { useProfile } from '../../app/context/ProfileContext';
import { supabase } from '../../shared/utils/supabase';
import type { WorkspaceModule } from '../../shared/constants/navigation';
import {
  clientOperationsService,
  type ClientProfileDetail,
  type ClientProfileSummary,
} from '../../services/client-operations.service';
import { ClientProfileDetail as ClientProfileDetailView } from './ClientProfileDetail';
import { ClientProfilesList } from './ClientProfilesList';
import type { ClientOperationsVisibleModules } from './types';

const ALL_MODULES_VISIBLE: ClientOperationsVisibleModules = {
  calendar: true,
  kanban: true,
  approval: true,
  ideas: true,
  references: true,
};

const NO_MODULES_VISIBLE: ClientOperationsVisibleModules = {
  calendar: false,
  kanban: false,
  approval: false,
  ideas: false,
  references: false,
};

const PROFILE_PERMISSION_IDS = ['calendar', 'kanban', 'approval', 'ideas', 'references'] as const;

export const ClientOperationsModule = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActiveModule } = useApp();
  const { user } = useAuth();
  const { profiles, activeProfile, setActiveProfile } = useProfile();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [summaries, setSummaries] = React.useState<ClientProfileSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = React.useState<ClientProfileDetail | null>(null);
  const [selectedPermissions, setSelectedPermissions] =
    React.useState<ClientOperationsVisibleModules>(ALL_MODULES_VISIBLE);
  const [isLoadingSummaries, setIsLoadingSummaries] = React.useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);
  const [summaryErrorMessage, setSummaryErrorMessage] = React.useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState('');
  const [noteErrorMessage, setNoteErrorMessage] = React.useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = React.useState(false);

  const selectedProfileId = searchParams.get('client');

  const loadSummaries = React.useCallback(async () => {
    setIsLoadingSummaries(true);
    setSummaryErrorMessage(null);

    try {
      const data = await clientOperationsService.getClientProfilesSummary();
      setSummaries(data);
    } catch (error) {
      console.error('[ClientOperationsModule] Failed to load profile summaries:', error);
      setSummaries([]);
      setSummaryErrorMessage('Não foi possível carregar a Central de Clientes agora.');
    } finally {
      setIsLoadingSummaries(false);
    }
  }, []);

  const loadSelectedPermissions = React.useCallback(
    async (profileId: string) => {
      const selectedProfile = profiles.find((profile) => profile.id === profileId);

      if (!profileId) {
        setSelectedPermissions(ALL_MODULES_VISIBLE);
        return;
      }

      if (!supabase || !user || !selectedProfile || selectedProfile.role === 'owner') {
        setSelectedPermissions(ALL_MODULES_VISIBLE);
        return;
      }

      try {
        const permissionChecks = await Promise.all(
          PROFILE_PERMISSION_IDS.map(async (permissionId) => {
            const { data, error } = await supabase.rpc('current_user_has_workspace_permission', {
              target_profile_id: profileId,
              required_permission: permissionId,
            });

            if (error) throw error;
            return [permissionId, !!data] as const;
          })
        );

        setSelectedPermissions(
          permissionChecks.reduce(
            (acc, [permissionId, value]) => {
              acc[permissionId] = value;
              return acc;
            },
            { ...NO_MODULES_VISIBLE }
          )
        );
      } catch (error) {
        console.error('[ClientOperationsModule] Failed to load selected profile permissions:', error);
        setSelectedPermissions(ALL_MODULES_VISIBLE);
      }
    },
    [profiles, user]
  );

  const loadDetail = React.useCallback(
    async (profileId: string) => {
      if (!profileId) {
        setSelectedDetail(null);
        setDetailErrorMessage(null);
        setSelectedPermissions(ALL_MODULES_VISIBLE);
        return;
      }

      setIsLoadingDetail(true);
      setDetailErrorMessage(null);
      setNoteErrorMessage(null);

      try {
        const [detail] = await Promise.all([
          clientOperationsService.getClientProfileDetail(profileId),
          loadSelectedPermissions(profileId),
        ]);

        if (!detail) {
          setSelectedDetail(null);
          setDetailErrorMessage('Este cliente não está disponível para a sua conta.');
          return;
        }

        setSelectedDetail(detail);
      } catch (error) {
        console.error('[ClientOperationsModule] Failed to load profile detail:', error);
        setSelectedDetail(null);
        setDetailErrorMessage('Não foi possível carregar os detalhes deste cliente agora.');
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [loadSelectedPermissions]
  );

  React.useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  React.useEffect(() => {
    if (!selectedProfileId) {
      setSelectedDetail(null);
      setDetailErrorMessage(null);
      setSelectedPermissions(ALL_MODULES_VISIBLE);
      return;
    }

    void loadDetail(selectedProfileId);
  }, [loadDetail, selectedProfileId]);

  const filteredSummaries = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return summaries;

    return summaries.filter((profile) => profile.name.toLowerCase().includes(normalizedSearch));
  }, [searchTerm, summaries]);

  const handleSelectProfile = React.useCallback(
    (profileId: string) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('client', profileId);
      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const handleBackToList = React.useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('client');
    setSearchParams(nextSearchParams);
  }, [searchParams, setSearchParams]);

  const handleActivateProfile = React.useCallback(() => {
    if (!selectedProfileId) return;

    const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
    if (!selectedProfile) return;

    setActiveProfile(selectedProfile);
  }, [profiles, selectedProfileId, setActiveProfile]);

  const handleOpenModule = React.useCallback(
    (moduleId: WorkspaceModule) => {
      if (selectedProfileId) {
        const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
        if (selectedProfile) {
          setActiveProfile(selectedProfile);
        }
      }

      setActiveModule(moduleId);
    },
    [profiles, selectedProfileId, setActiveModule, setActiveProfile]
  );

  const handleSaveNote = React.useCallback(async () => {
    if (!selectedProfileId) return;

    setIsSavingNote(true);
    setNoteErrorMessage(null);

    try {
      await clientOperationsService.createClientProfileNote(selectedProfileId, noteDraft);
      setNoteDraft('');
      await Promise.all([loadSummaries(), loadDetail(selectedProfileId)]);
    } catch (error) {
      console.error('[ClientOperationsModule] Failed to save note:', error);
      setNoteErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a nota deste cliente agora.'
      );
    } finally {
      setIsSavingNote(false);
    }
  }, [loadDetail, loadSummaries, noteDraft, selectedProfileId]);

  return selectedProfileId ? (
    <ClientProfileDetailView
      detail={selectedDetail}
      visibleModules={selectedPermissions}
      isActiveProfile={activeProfile?.id === selectedProfileId}
      isLoading={isLoadingDetail}
      errorMessage={detailErrorMessage}
      noteDraft={noteDraft}
      noteErrorMessage={noteErrorMessage}
      isSavingNote={isSavingNote}
      onNoteDraftChange={setNoteDraft}
      onSaveNote={handleSaveNote}
      onBack={handleBackToList}
      onActivateProfile={handleActivateProfile}
      onOpenModule={handleOpenModule}
    />
  ) : (
    <ClientProfilesList
      profiles={filteredSummaries}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      activeProfileId={activeProfile?.id}
      isMemberView={!!user?.isMemberOnlyAccount}
      isLoading={isLoadingSummaries}
      errorMessage={summaryErrorMessage}
      onSelectProfile={handleSelectProfile}
    />
  );
};
