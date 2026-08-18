import { createClient } from 'npm:@supabase/supabase-js@2';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const INTEGRATION_TOKEN_SECRET = Deno.env.get('INTEGRATION_TOKEN_ENCRYPTION_KEY') ?? '';

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return fromBase64(padded);
}

async function sha256Bytes(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return new Uint8Array(digest);
}

async function getAesKey(secret: string) {
  const hash = await sha256Bytes(secret);
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export function createUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export type SocialAdminClient = ReturnType<typeof createAdminClient>;

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
    authHeader,
    user,
    userClient,
    adminClient: createAdminClient(),
  };
}

export async function assertProfileAccess(
  userClient: ReturnType<typeof createUserClient>,
  params: { profileId: string }
) {
  const { profileId } = params;

  const { data, error } = await userClient.rpc('current_user_can_access_profile', {
    target_profile_id: profileId,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Você não tem acesso a este perfil.');
  }

  return { profileId };
}

export async function encryptSecret(plainText: string) {
  if (!INTEGRATION_TOKEN_SECRET) {
    throw new Error('INTEGRATION_TOKEN_ENCRYPTION_KEY is missing.');
  }

  const key = await getAesKey(INTEGRATION_TOKEN_SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plainText)
  );

  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipherBuffer))}`;
}

export async function decryptSecret(cipherText: string) {
  if (!INTEGRATION_TOKEN_SECRET) {
    throw new Error('INTEGRATION_TOKEN_ENCRYPTION_KEY is missing.');
  }

  const [ivEncoded, payloadEncoded] = cipherText.split('.');
  if (!ivEncoded || !payloadEncoded) {
    throw new Error('Invalid encrypted secret payload.');
  }

  const key = await getAesKey(INTEGRATION_TOKEN_SECRET);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(ivEncoded) },
    key,
    fromBase64Url(payloadEncoded)
  );

  return textDecoder.decode(plainBuffer);
}
