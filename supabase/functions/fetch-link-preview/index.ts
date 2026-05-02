import { corsHeaders } from '../_shared/cors.ts';
import { requireAuthenticatedUser } from '../_shared/meta.ts';

interface FetchLinkPreviewPayload {
  url?: string;
}

interface LinkPreviewResponse {
  requestedUrl: string;
  resolvedUrl: string;
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
}

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

const PREVIEW_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (compatible; PostHubLinkPreview/1.0; +https://posthub.com.br)',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeWhitespace = (value?: string | null) =>
  value?.replace(/\s+/g, ' ').trim() || '';

const toCodePoint = (value: number, fallback: string) => {
  if (Number.isNaN(value) || value < 0 || value > 0x10ffff) {
    return fallback;
  }

  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
};

const decodeHtmlEntities = (value?: string | null) =>
  normalizeWhitespace(value).replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (entity, rawCode: string) => {
      const code = rawCode.toLowerCase();

      if (code.startsWith('#x')) {
        const parsed = Number.parseInt(code.slice(2), 16);
        return toCodePoint(parsed, entity);
      }

      if (code.startsWith('#')) {
        const parsed = Number.parseInt(code.slice(1), 10);
        return toCodePoint(parsed, entity);
      }

      return HTML_ENTITY_MAP[code] ?? entity;
    }
  );

const parseAttributes = (tag: string) => {
  const attributes: Record<string, string> = {};
  const attributeRegex =
    /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(attributeRegex)) {
    const [, rawName, doubleQuoted, singleQuoted, unquoted] = match;
    const name = rawName.toLowerCase();
    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
    attributes[name] = decodeHtmlEntities(value);
  }

  return attributes;
};

const extractMetaMap = (html: string) => {
  const metaMap = new Map<string, string>();

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const key = (attributes.property || attributes.name || '').toLowerCase();
    const content = normalizeWhitespace(attributes.content);

    if (key && content && !metaMap.has(key)) {
      metaMap.set(key, content);
    }
  }

  return metaMap;
};

const extractLinkMap = (html: string) => {
  const linkMap = new Map<string, string>();

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const rel = normalizeWhitespace(attributes.rel).toLowerCase();
    const href = normalizeWhitespace(attributes.href);

    if (rel && href && !linkMap.has(rel)) {
      linkMap.set(rel, href);
    }
  }

  return linkMap;
};

const pickFirst = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const resolveUrl = (value: string, baseUrl: string) => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
};

const extractTitleTag = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtmlEntities(match?.[1] || '');
};

const inferSiteName = (resolvedUrl: string) => {
  try {
    const hostname = new URL(resolvedUrl).hostname.replace(/^www\./i, '');
    const [firstLabel] = hostname.split('.');

    if (!firstLabel) {
      return hostname;
    }

    return firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1);
  } catch {
    return 'Link externo';
  }
};

const normalizeTargetUrl = (value: string) => {
  let normalized = value.trim();

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  const url = new URL(normalized);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Use um link HTTP ou HTTPS válido.');
  }

  return url.toString();
};

const parsePreviewFromHtml = (html: string, requestedUrl: string, resolvedUrl: string): LinkPreviewResponse => {
  const metaMap = extractMetaMap(html);
  const linkMap = extractLinkMap(html);

  const siteName = pickFirst(
    metaMap.get('og:site_name'),
    metaMap.get('application-name'),
    inferSiteName(resolvedUrl)
  );

  const title = pickFirst(
    metaMap.get('og:title'),
    metaMap.get('twitter:title'),
    extractTitleTag(html),
    siteName
  );

  const description = pickFirst(
    metaMap.get('og:description'),
    metaMap.get('twitter:description'),
    metaMap.get('description')
  );

  const imageCandidate = pickFirst(
    metaMap.get('og:image:secure_url'),
    metaMap.get('og:image'),
    metaMap.get('twitter:image'),
    metaMap.get('twitter:image:src'),
    linkMap.get('image_src')
  );

  const imageUrl = imageCandidate ? resolveUrl(imageCandidate, resolvedUrl) : null;
  const canonicalUrl = pickFirst(
    metaMap.get('og:url'),
    linkMap.get('canonical'),
    resolvedUrl
  );

  return {
    requestedUrl,
    resolvedUrl: resolveUrl(canonicalUrl, resolvedUrl) || resolvedUrl,
    title,
    description,
    imageUrl,
    siteName,
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    await requireAuthenticatedUser(request);

    const payload = (await request.json()) as FetchLinkPreviewPayload;
    const requestedUrl = normalizeTargetUrl(payload.url || '');

    const response = await fetch(requestedUrl, {
      headers: PREVIEW_HEADERS,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Não foi possível carregar o link (${response.status}).`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      throw new Error('Este link não disponibiliza uma página HTML para gerar prévia.');
    }

    const html = (await response.text()).slice(0, 750_000);
    const resolvedUrl = response.url || requestedUrl;
    const preview = parsePreviewFromHtml(html, requestedUrl, resolvedUrl);

    if (!preview.title && !preview.description && !preview.imageUrl) {
      throw new Error('Não encontramos metadados públicos suficientes para montar a prévia.');
    }

    return jsonResponse({ preview });
  } catch (error) {
    console.error('[fetch-link-preview] error:', error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível gerar a prévia do link.',
      },
      400
    );
  }
});
