import { corsHeaders } from '../_shared/cors.ts';
import {
  jsonResponse,
  requireAuthenticatedUser,
} from '../_shared/stripe/runtime.ts';
import { resolveProfileExtraStatusSnapshot } from '../../../shared/profile-extra-subscriptions.ts';

interface ProfileExtraStatusRow {
  status: string;
  target_profile_id: string | null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const { user, adminClient } = await requireAuthenticatedUser(request);

    const { data, error } = await adminClient
      .from('profile_extra_subscriptions')
      .select('status, target_profile_id')
      .eq('purchased_by_user_id', user.id)
      .in('status', ['checkout_pending', 'incomplete', 'trialing', 'active', 'past_due', 'paused'])
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    const snapshot = resolveProfileExtraStatusSnapshot({
      subscriptions: ((data ?? []) as ProfileExtraStatusRow[]).map((subscription) => ({
        status: subscription.status,
        targetProfileId: subscription.target_profile_id,
      })),
    });

    return jsonResponse(snapshot);
  } catch (error) {
    console.error('[get-profile-extra-status] failed', error);
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Nao foi possivel carregar o status de perfil adicional.',
      },
      400
    );
  }
});
