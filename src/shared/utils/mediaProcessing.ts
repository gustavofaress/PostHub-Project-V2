export const TARGET_VIDEO_UPLOAD_SIZE = 45 * 1024 * 1024;

const VIDEO_RENDER_MAX_DIMENSION = 720;
const VIDEO_RENDER_FPS = 24;
const MIN_VIDEO_BITRATE = 250_000;
const MAX_VIDEO_BITRATE = 2_500_000;

type VideoRenderProgressCallback = (progress: number, status: string) => void;
type AudioRenderSource = {
  tracks: MediaStreamTrack[];
  cleanup: () => void;
};

const getVideoRecorderMimeType = () => {
  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];

  return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const loadVideoForProcessing = async (url: string) => {
  const video = document.createElement('video');
  video.src = url;
  video.preload = 'auto';
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Não foi possível ler o vídeo selecionado.'));
  });

  return video;
};

const getRenderedVideoDimensions = (video: HTMLVideoElement) => {
  const sourceWidth = video.videoWidth || 720;
  const sourceHeight = video.videoHeight || 1280;
  const scale = Math.min(1, VIDEO_RENDER_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));

  return {
    width: Math.max(2, Math.round((sourceWidth * scale) / 2) * 2),
    height: Math.max(2, Math.round((sourceHeight * scale) / 2) * 2),
  };
};

const createVideoAudioSource = (video: HTMLVideoElement): AudioRenderSource => {
  const AudioContextConstructor =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return { tracks: [], cleanup: () => {} };
  }

  try {
    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    return {
      tracks: destination.stream.getAudioTracks(),
      cleanup: () => {
        destination.stream.getTracks().forEach((track) => track.stop());
        void audioContext.close();
      },
    };
  } catch (error) {
    console.warn('Failed to preserve video audio while rendering', error);
    return { tracks: [], cleanup: () => {} };
  }
};

export const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

export const renderCompressedVideo = async (
  file: File,
  sourceUrl: string,
  onProgress?: VideoRenderProgressCallback
): Promise<File> => {
  if (file.size <= TARGET_VIDEO_UPLOAD_SIZE) {
    onProgress?.(90, 'Vídeo já está no tamanho ideal. Preparando envio...');
    return file;
  }

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Seu navegador não consegue compactar vídeos antes do envio.');
  }

  const mimeType = getVideoRecorderMimeType();
  if (!mimeType) {
    throw new Error('Seu navegador não suporta o formato necessário para compactar vídeos.');
  }

  const video = await loadVideoForProcessing(sourceUrl);
  const duration = video.duration;

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Não foi possível identificar a duração do vídeo.');
  }

  const { width, height } = getRenderedVideoDimensions(video);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível preparar a renderização do vídeo.');
  }

  const stream = canvas.captureStream(VIDEO_RENDER_FPS);
  const audioSource = createVideoAudioSource(video);
  audioSource.tracks.forEach((track) => stream.addTrack(track));

  const targetBits = TARGET_VIDEO_UPLOAD_SIZE * 8 * 0.9;
  const videoBitsPerSecond = Math.max(
    MIN_VIDEO_BITRATE,
    Math.min(MAX_VIDEO_BITRATE, Math.floor(targetBits / duration))
  );
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
    audioBitsPerSecond: audioSource.tracks.length > 0 ? 96_000 : undefined,
  });
  let lastReportedProgress = 0;

  const recordingFinished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('Não foi possível compactar o vídeo.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  if (video.currentTime !== 0) {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = 0;
    });
  }

  const drawFrame = () => {
    if (video.ended || video.paused) return;
    ctx.drawImage(video, 0, 0, width, height);
    const progress = Math.min(90, Math.max(10, 10 + (video.currentTime / duration) * 80));
    if (progress - lastReportedProgress >= 1) {
      lastReportedProgress = progress;
      onProgress?.(Math.round(progress), 'Renderizando e compactando o vídeo...');
    }
    requestAnimationFrame(drawFrame);
  };

  video.muted = false;
  onProgress?.(10, 'Iniciando renderização do vídeo...');
  recorder.start(1000);

  try {
    await video.play();
    drawFrame();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    onProgress?.(92, 'Finalizando renderização...');
    recorder.stop();

    const renderedBlob = await recordingFinished;
    if (renderedBlob.size > TARGET_VIDEO_UPLOAD_SIZE) {
      throw new Error('O vídeo ainda ficou acima do limite permitido pelo Supabase após a compactação.');
    }

    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';

    return new File([renderedBlob], `${baseName}-compactado.${extension}`, {
      type: renderedBlob.type,
      lastModified: Date.now(),
    });
  } finally {
    video.pause();
    stream.getTracks().forEach((track) => track.stop());
    audioSource.cleanup();
  }
};
