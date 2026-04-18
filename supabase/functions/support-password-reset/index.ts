import { createClient } from 'npm:@supabase/supabase-js@2.56.0';
import { corsHeaders } from '../_shared/cors.ts';

type ResetMode = 'create' | 'validate' | 'complete';

interface SupportPasswordResetPayload {
  mode?: ResetMode;
  token?: string;
  email?: string;
  password?: string;
}

interface SupportPasswordResetRow {
  id: string;
  email: string;
  auth_user_id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

const DEFAULT_APP_URL = 'https://www.posthub.com.br';
const SUPPORT_RESET_PATH = '/suporte/redefinir-senha';
const TOKEN_TTL_MINUTES = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isExpired = (value: string) => new Date(value).getTime() <= Date.now();

const buildSupportResetUrl = (token: string) => {
  const appUrl =
    Deno.env.get('APP_URL') ??
    Deno.env.get('POSTHUB_APP_URL') ??
    DEFAULT_APP_URL;

  try {
    const url = new URL(SUPPORT_RESET_PATH, appUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    return `${DEFAULT_APP_URL}${SUPPORT_RESET_PATH}?token=${encodeURIComponent(token)}`;
  }
};

const maskEmail = (email: string) => {
  const [localPart, domainPart] = email.split('@');

  if (!localPart || !domainPart) {
    return email;
  }

  const maskedLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? ''}*`
      : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 2))}`;

  const domainSegments = domainPart.split('.');
  const maskedDomain = domainSegments
    .map((segment, index) => {
      if (segment.length <= 2) {
        return index === domainSegments.length - 1 ? segment : `${segment[0] ?? ''}*`;
      }

      if (index === domainSegments.length - 1) {
        return segment;
      }

      return `${segment[0]}${'*'.repeat(Math.max(segment.length - 1, 2))}`;
    })
    .join('.');

  return `${maskedLocal}@${maskedDomain}`;
};

const createToken = () => {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const hashToken = async (token: string) => {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const findAuthUserByEmail = async ({
  serviceClient,
  email,
}: {
  serviceClient: ReturnType<typeof createClient>;
  email: string;
}) => {
  let page = 1;

  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(error.message || 'Nao foi possivel consultar os usuarios de autenticacao.');
    }

    const matchedUser =
      data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (!data.nextPage || data.nextPage <= page) {
      return null;
    }

    page = data.nextPage;
  }
};

const getAdminUser = async ({
  request,
  supabaseUrl,
  supabaseAnonKey,
  serviceClient,
}: {
  request: Request;
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceClient: ReturnType<typeof createClient>;
}) => {
  const authHeader = request.headers.get('Authorization') ?? '';

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuario nao autenticado.');
  }

  const { data: adminRecord, error: adminError } = await serviceClient
    .from('usuarios')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (!adminRecord?.is_admin) {
    throw new Error('Sem permissao para gerar links de redefinicao.');
  }

  return user;
};

const getTokenRecord = async ({
  serviceClient,
  token,
}: {
  serviceClient: ReturnType<typeof createClient>;
  token: string;
}) => {
  const tokenHash = await hashToken(token);
  const { data, error } = await serviceClient
    .from('support_password_reset_tokens')
    .select('id, email, auth_user_id, expires_at, used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupportPasswordResetRow | null) ?? null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metodo nao suportado.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase env vars ausentes.' }, 500);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const payload = (await request.json()) as SupportPasswordResetPayload;
    const mode = payload.mode ?? 'validate';

    if (mode === 'create') {
      const adminUser = await getAdminUser({
        request,
        supabaseUrl,
        supabaseAnonKey,
        serviceClient,
      });

      const email = payload.email ? normalizeEmail(payload.email) : '';

      if (!email) {
        return json({ error: 'email e obrigatorio.' }, 400);
      }

      const { data: usuarioRecord, error: usuarioError } = await serviceClient
        .from('usuarios')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (usuarioError) {
        return json({ error: usuarioError.message }, 400);
      }

      const authUserId =
        usuarioRecord?.id ??
        (await findAuthUserByEmail({
          serviceClient,
          email,
        }))?.id ??
        null;

      if (!authUserId) {
        return json({ error: 'Nao encontramos uma conta com este email.' }, 404);
      }

      await serviceClient
        .from('support_password_reset_tokens')
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq('email', email)
        .is('used_at', null)
        .is('revoked_at', null);

      const rawToken = createToken();
      const tokenHash = await hashToken(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

      const { error: insertError } = await serviceClient
        .from('support_password_reset_tokens')
        .insert({
          email,
          auth_user_id: authUserId,
          created_by_user_id: adminUser.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        });

      if (insertError) {
        return json({ error: insertError.message }, 400);
      }

      return json({
        email,
        maskedEmail: maskEmail(email),
        supportResetUrl: buildSupportResetUrl(rawToken),
        expiresAt,
      });
    }

    const token = payload.token?.trim() ?? '';

    if (!token) {
      return json({ error: 'token e obrigatorio.' }, 400);
    }

    const tokenRecord = await getTokenRecord({
      serviceClient,
      token,
    });

    if (
      !tokenRecord ||
      !!tokenRecord.used_at ||
      !!tokenRecord.revoked_at ||
      isExpired(tokenRecord.expires_at)
    ) {
      return json({ error: 'Este link e invalido ou expirou. Solicite um novo suporte.' }, 400);
    }

    if (mode === 'validate') {
      return json({
        maskedEmail: maskEmail(tokenRecord.email),
        expiresAt: tokenRecord.expires_at,
      });
    }

    if (mode !== 'complete') {
      return json({ error: 'Modo nao suportado.' }, 400);
    }

    const email = payload.email ? normalizeEmail(payload.email) : '';
    const password = payload.password?.trim() ?? '';

    if (!email) {
      return json({ error: 'email e obrigatorio.' }, 400);
    }

    if (email !== tokenRecord.email) {
      return json(
        {
          error: 'Informe o mesmo email que recebeu este link para continuar.',
        },
        400
      );
    }

    if (password.length < 8) {
      return json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' }, 400);
    }

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      tokenRecord.auth_user_id,
      {
        password,
        email_confirm: true,
      }
    );

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    const { error: markUsedError } = await serviceClient
      .from('support_password_reset_tokens')
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    if (markUsedError) {
      return json({ error: markUsedError.message }, 400);
    }

    return json({
      success: true,
    });
  } catch (error) {
    console.error('[support-password-reset] unexpected error', error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao processar o suporte de redefinicao.',
      },
      500
    );
  }
});
