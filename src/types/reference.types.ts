export type ReferenceType = 'link' | 'image' | 'video' | 'screen_recording';

export interface ReferenceItem {
  id: string;
  user_id: string;
  profile_id: string;

  title: string;
  description: string;
  type: ReferenceType;

  source: string;
  source_url?: string | null;

  thumbnail_url?: string | null;
  file_url?: string | null;

  tags: string[];
  folder?: string | null;
  campaign?: string | null;
  platform?: string | null;
  format?: string | null;
  notes?: string | null;

  file_name?: string | null;
  file_size_mb?: number | null;

  created_at: string;
  updated_at: string;
}

export interface CreateReferenceInput {
  profile_id: string;
  title: string;
  description: string;
  type: ReferenceType;
  source: string;
  source_url?: string;
  thumbnail_url?: string | null;
  file_url?: string | null;
  tags?: string[];
  folder?: string;
  campaign?: string;
  platform?: string;
  format?: string;
  notes?: string;
  file_name?: string;
  file_size_mb?: number;
}

export interface UpdateReferenceInput extends Partial<CreateReferenceInput> {
  id: string;
}
