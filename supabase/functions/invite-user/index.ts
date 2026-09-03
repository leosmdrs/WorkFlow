/**
 * invite-user — cria/convida usuário. Executada como service role,
 * mas exige um chamador autenticado com role=admin. Sem essa dupla
 * checagem, qualquer cliente com a URL da função elevaria privilégios.
 *
 * Recebe:
 *   { email, username, full_name, role, unit,
 *     mode: 'invite' | 'temporary_password' }
 *
 * Em 'invite': dispara e-mail com magic link para definir senha.
 * Em 'temporary_password': cria com senha aleatória, devolve no response
 *   uma única vez (admin passa a senha ao usuário fora da banda).
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function randomPassword(): string {
  // 24 chars com garantias mínimas — suficiente para "senha temporária".
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replaceAll('/', '_').replaceAll('+', '-');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'missing_bearer' });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Verifica o chamador com o próprio JWT — não confia no client.
  const { data: caller } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!caller.user) return json(401, { error: 'invalid_token' });

  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', caller.user.id)
    .single();
  if (!profile?.is_active || profile.role !== 'admin') {
    return json(403, { error: 'forbidden' });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const { email, username, full_name, role = 'member', unit = null, mode = 'invite' } = payload;
  if (!email || !username || !full_name) {
    return json(400, { error: 'missing_fields' });
  }
  if (role !== 'member' && role !== 'admin') {
    return json(400, { error: 'invalid_role' });
  }

  let userId: string;
  let temporaryPassword: string | null = null;

  if (mode === 'temporary_password') {
    temporaryPassword = randomPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name, username },
    });
    if (error) return json(400, { error: error.message });
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, username },
    });
    if (error) return json(400, { error: error.message });
    userId = data.user.id;
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    username,
    full_name,
    role,
    unit,
  });
  if (profileError) {
    // Rollback: se não conseguiu criar o profile, apaga o auth.user
    // para não deixar órfão. O usuário refaz o convite depois.
    await admin.auth.admin.deleteUser(userId);
    return json(400, { error: profileError.message });
  }

  return json(200, {
    user_id: userId,
    temporary_password: temporaryPassword,
    mode,
  });
});
