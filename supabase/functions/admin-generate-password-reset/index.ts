import { createClient } from 'npm:@supabase/supabase-js@2.56.0';
import { corsHeaders } from '../_shared/cors.ts';

interface GeneratePasswordResetPayload {
  email?: string;
}

const DEFAULT_APP_URL = 'https://www.posthub.com.br';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const buildResetPasswordUrl = () => {
  const appUrl =
    Deno.env.get('APP_URL') ??
    Deno.env.get('POSTHUB_APP_URL') ??
    DEFAULT_APP_URL;

  try {
    return new URL('/reset-password', appUrl).toString();
  } catch {
    return `${DEFAULT_APP_URL}/reset-password`;
  }
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

    const authHeader = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Usuario nao autenticado.' }, 401);
    }

    const { data: adminRecord, error: adminError } = await serviceClient
      .from('usuarios')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError) {
      return json({ error: adminError.message }, 400);
    }

    if (!adminRecord?.is_admin) {
      return json({ error: 'Sem permissao para gerar links de redefinicao.' }, 403);
    }

    const payload = (await request.json()) as GeneratePasswordResetPayload;
    const email = payload.email?.trim().toLowerCase() ?? '';

    if (!email) {
      return json({ error: 'email e obrigatorio.' }, 400);
    }

    const redirectTo = buildResetPasswordUrl();
    const { data, error } = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    const actionLink = data.properties?.action_link;

    if (!actionLink) {
      return json({ error: 'Nao foi possivel gerar o link de redefinicao.' }, 500);
    }

    return json({
      email,
      actionLink,
      redirectTo,
    });
  } catch (error) {
    console.error('[admin-generate-password-reset] unexpected error', error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao gerar link de redefinicao.',
      },
      500
    );
  }
});
