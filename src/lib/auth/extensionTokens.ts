import { createHash, randomBytes } from 'node:crypto';

import { getAllowedExtensionOrigins } from '../http/extensionCors';
import { createSupabaseServiceClient } from '../supabase/server';

const EXTENSION_CODE_TTL_MS = 60 * 1000;
const EXTENSION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const EXTENSION_TOKEN_PREFIX = 'akuma_ext_';
const EXTENSION_REDIRECT_PATH = '/akuma';

interface ExtensionAuthCodeRow {
    consumed_at: string | null;
    expires_at: string;
    redirect_origin: string;
    user_id: string;
}

interface ExtensionTokenRow {
    expires_at: string;
    revoked_at: string | null;
    user_id: string;
}

export function createExtensionSecret(prefix = '') {
    return `${prefix}${randomBytes(32).toString('base64url')}`;
}

export function hashExtensionSecret(secret: string) {
    return createHash('sha256').update(secret).digest('hex');
}

export function getExtensionBearerToken(request: Request) {
    const header = request.headers.get('authorization');
    const match = header ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;
    const token = match?.[1] ?? null;

    return token?.startsWith(EXTENSION_TOKEN_PREFIX) ? token : null;
}

export function isAllowedExtensionRedirectUrl(redirectUrl: string) {
    return parseAllowedExtensionRedirectUrl(redirectUrl) !== null;
}

export async function createExtensionAuthCode(userId: string, redirectUrl: string) {
    const redirect = parseAllowedExtensionRedirectUrl(redirectUrl);
    if (!redirect) {
        throw new Error('Invalid extension redirect URL');
    }

    const code = createExtensionSecret();
    const codeHash = hashExtensionSecret(code);
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from('akuma_extension_auth_codes').insert({
        code_hash: codeHash,
        expires_at: new Date(Date.now() + EXTENSION_CODE_TTL_MS).toISOString(),
        redirect_origin: redirect.origin,
        user_id: userId,
    });

    if (error) {
        throw error;
    }

    return code;
}

export async function exchangeExtensionAuthCode(code: string, redirectUrl: string) {
    const redirect = parseAllowedExtensionRedirectUrl(redirectUrl);
    if (!redirect) {
        return null;
    }

    const codeHash = hashExtensionSecret(code);
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from('akuma_extension_auth_codes')
        .select('consumed_at,expires_at,redirect_origin,user_id')
        .eq('code_hash', codeHash)
        .maybeSingle<ExtensionAuthCodeRow>();

    if (error) {
        throw error;
    }

    if (
        !data ||
        data.consumed_at !== null ||
        data.redirect_origin !== redirect.origin ||
        new Date(data.expires_at).getTime() <= Date.now()
    ) {
        return null;
    }

    const { data: consumedCode, error: consumeError } = await supabase
        .from('akuma_extension_auth_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('code_hash', codeHash)
        .is('consumed_at', null)
        .select('id')
        .maybeSingle<{ id: string }>();

    if (consumeError) {
        throw consumeError;
    }

    if (!consumedCode) {
        return null;
    }

    const token = createExtensionSecret(EXTENSION_TOKEN_PREFIX);
    const { error: tokenError } = await supabase.from('akuma_extension_tokens').insert({
        expires_at: new Date(Date.now() + EXTENSION_TOKEN_TTL_MS).toISOString(),
        token_hash: hashExtensionSecret(token),
        user_id: data.user_id,
    });

    if (tokenError) {
        throw tokenError;
    }

    return {
        expiresAt: Date.now() + EXTENSION_TOKEN_TTL_MS,
        token,
        userId: data.user_id,
    };
}

export async function validateExtensionToken(token: string) {
    const tokenHash = hashExtensionSecret(token);
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .from('akuma_extension_tokens')
        .select('expires_at,revoked_at,user_id')
        .eq('token_hash', tokenHash)
        .maybeSingle<ExtensionTokenRow>();

    if (error) {
        throw error;
    }

    if (!data || data.revoked_at !== null || new Date(data.expires_at).getTime() <= Date.now()) {
        return null;
    }

    await supabase
        .from('akuma_extension_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);

    return {
        userId: data.user_id,
    };
}

function parseAllowedExtensionRedirectUrl(redirectUrl: string) {
    let redirect: URL;
    try {
        redirect = new URL(redirectUrl);
    } catch {
        return null;
    }

    if (redirect.protocol !== 'https:' || redirect.pathname !== EXTENSION_REDIRECT_PATH) {
        return null;
    }

    return getAllowedExtensionRedirectOrigins().has(redirect.origin) ? redirect : null;
}

function getAllowedExtensionRedirectOrigins() {
    return new Set(
        [...getAllowedExtensionOrigins()]
            .map(origin => {
                try {
                    const extensionOrigin = new URL(origin);
                    if (extensionOrigin.protocol !== 'chrome-extension:' || !extensionOrigin.hostname) {
                        return null;
                    }

                    return `https://${extensionOrigin.hostname}.chromiumapp.org`;
                } catch {
                    return null;
                }
            })
            .filter((origin): origin is string => origin !== null),
    );
}
