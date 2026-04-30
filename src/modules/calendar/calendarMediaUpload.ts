import { renderCompressedVideo } from '../../shared/utils/mediaProcessing';
import { approvalService } from '../approval/services/approvalService';
import type {
  ApprovalContentType,
  MediaState,
} from '../approval/approval.types';

const MAX_SOURCE_MEDIA_SIZE = 1.5 * 1024 * 1024 * 1024;

const createPersistedImagePreview = async (sourceUrl: string) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.src = sourceUrl;

    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });

    const MAX_DIMENSION = 800;
    let width = image.width;
    let height = image.height;

    if (width > height && width > MAX_DIMENSION) {
      height *= MAX_DIMENSION / width;
      width = MAX_DIMENSION;
    } else if (height > MAX_DIMENSION) {
      width *= MAX_DIMENSION / height;
      height = MAX_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx?.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.75);
  } catch (error) {
    console.error('[calendarMediaUpload] Failed to create image preview:', error);
    return '';
  }
};

const createPersistedVideoPreview = async (sourceUrl: string) => {
  try {
    const video = document.createElement('video');
    video.src = sourceUrl;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2 || 1);
      };
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Não foi possível gerar a prévia do vídeo.'));
      setTimeout(() => resolve(), 3000);
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const MAX_DIMENSION = 800;
    let width = video.videoWidth || 800;
    let height = video.videoHeight || 600;

    if (width > height && width > MAX_DIMENSION) {
      height *= MAX_DIMENSION / width;
      width = MAX_DIMENSION;
    } else if (height > MAX_DIMENSION) {
      width *= MAX_DIMENSION / height;
      height = MAX_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx?.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.75);
  } catch (error) {
    console.error('[calendarMediaUpload] Failed to create video preview:', error);
    return '';
  }
};

export const uploadCalendarMediaFiles = async (input: {
  profileId: string;
  files: File[];
  contentType: ApprovalContentType;
  existingItemsCount?: number;
  onProgress?: (progress: number, status: string) => void;
}): Promise<MediaState[]> => {
  if (!input.profileId) {
    throw new Error('Selecione um perfil antes de enviar mídia.');
  }

  const validFiles = input.files.filter(
    (file) =>
      file.size <= MAX_SOURCE_MEDIA_SIZE &&
      (file.type.startsWith('image/') || file.type.startsWith('video/'))
  );

  if (validFiles.length === 0) {
    throw new Error('Selecione arquivos de imagem ou vídeo válidos.');
  }

  const filesToProcess = input.contentType === 'carousel' ? validFiles : [validFiles[0]];
  const totalFiles = filesToProcess.length;

  return Promise.all(
    filesToProcess.map(async (file, index) => {
      const isVideo = file.type.startsWith('video/');
      const sourceUrl = URL.createObjectURL(file);

      try {
        input.onProgress?.(
          Math.max(5, Math.round((index / totalFiles) * 100)),
          `Preparando ${file.name}...`
        );

        const persistedPreview = isVideo
          ? await createPersistedVideoPreview(sourceUrl)
          : await createPersistedImagePreview(sourceUrl);

        const uploadFile = isVideo
          ? await renderCompressedVideo(file, sourceUrl, (progress, status) => {
              input.onProgress?.(
                Math.min(96, Math.round(((index + progress / 100) / totalFiles) * 100)),
                status
              );
            })
          : file;

        input.onProgress?.(
          Math.min(98, Math.round(((index + 0.98) / totalFiles) * 100)),
          `Enviando ${file.name}...`
        );

        const uploadedMedia = await approvalService.uploadApprovalMedia(
          input.profileId,
          uploadFile
        );

        return {
          id: crypto.randomUUID(),
          type: isVideo ? 'video' : 'image',
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
          previewUrl: uploadedMedia.fileUrl,
          persistedPreview,
          uploadStatus: 'ready',
          originalFileReference: uploadedMedia.filePath,
          order: (input.existingItemsCount || 0) + index,
        } satisfies MediaState;
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }
    })
  );
};
