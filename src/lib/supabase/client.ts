import { createBrowserClient } from '@supabase/ssr';

import { getSupabasePublishableKey, getSupabaseUrl } from './env';

export function createSupabaseBrowserClient() {
    return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
