import { createClient } from '@supabase/supabase-js';

import { getSupabasePublishableKey, getSupabaseSecretKey, getSupabaseUrl } from './env';

export function createSupabaseAuthClient() {
    return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export function createSupabaseServiceClient() {
    return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
