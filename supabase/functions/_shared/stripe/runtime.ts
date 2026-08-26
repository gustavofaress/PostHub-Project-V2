import Stripe from 'npm:stripe@20.4.1';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_APP_URL = 'https://www.posthub.com.br';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function getAppBaseUrl() {
  return (
    Deno.env.get('APP_URL')?.trim() ||
    Deno.env.get('POSTHUB_APP_URL')?.trim() ||
    DEFAULT_APP_URL
  );
}

export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  });
}

export function createUserClient(authHeader: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase public environment variables are missing.');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role environment variables are missing.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function requireAuthenticatedUser(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header.');
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error('Authenticated user not found.');
  }

  return {
    user,
    userClient,
    adminClient: createAdminClient(),
  };
}
