import { supabase } from '../shared/utils/supabase';
import type {
  ReferenceItem,
  CreateReferenceInput,
  UpdateReferenceInput,
} from '../types/reference.types';

const BUCKET_NAME = 'reference-files';

const getCurrentUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  return user.id;
};

const sanitizeFileName = (fileName: string): string => {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
    .toLowerCase();
};

export const referencesService = {
  async listByProfile(profileId: string): Promise<ReferenceItem[]> {
    const { data, error } = await supabase
      .from('reference_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as ReferenceItem[];
  },

  async create(input: CreateReferenceInput): Promise<ReferenceItem> {
    const userId = await getCurrentUserId();

    const payload = {
      user_id: userId,
      profile_id: input.profile_id,
      title: input.title,
      description: input.description ?? '',
      type: input.type,
      source: input.source,
      source_url: input.source_url ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      file_url: input.file_url ?? null,
      tags: input.tags ?? [],
      folder: input.folder ?? null,
      campaign: input.campaign ?? null,
      platform: input.platform ?? null,
      format: input.format ?? null,
      notes: input.notes ?? null,
      file_name: input.file_name ?? null,
      file_size_mb: input.file_size_mb ?? null,
    };

    const { data, error } = await supabase
      .from('reference_items')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as ReferenceItem;
  },

  async update(input: UpdateReferenceInput): Promise<ReferenceItem> {
    const { id, ...updates } = input;

    const payload: Record<string, unknown> = {};

    if (updates.profile_id !== undefined) payload.profile_id = updates.profile_id;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.source_url !== undefined) payload.source_url = updates.source_url;
    if (updates.thumbnail_url !== undefined) payload.thumbnail_url = updates.thumbnail_url;
    if (updates.file_url !== undefined) payload.file_url = updates.file_url;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.folder !== undefined) payload.folder = updates.folder;
    if (updates.campaign !== undefined) payload.campaign = updates.campaign;
    if (updates.platform !== undefined) payload.platform = updates.platform;
    if (updates.format !== undefined) payload.format = updates.format;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.file_name !== undefined) payload.file_name = updates.file_name;
    if (updates.file_size_mb !== undefined) payload.file_size_mb = updates.file_size_mb;

    const { data, error } = await supabase
      .from('reference_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as ReferenceItem;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('reference_items').delete().eq('id', id);

    if (error) {
      throw error;
    }
  },

  async uploadFile(
    profileId: string,
    file: File
  ): Promise<{
    fileUrl: string;
    filePath: string;
    fileName: string;
    fileSizeMb: number;
  }> {
    const userId = await getCurrentUserId();
    const safeName = sanitizeFileName(file.name);
    const filePath = `${userId}/${profileId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      fileUrl: data.publicUrl,
      filePath,
      fileName: file.name,
      fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
    };
  },
};
