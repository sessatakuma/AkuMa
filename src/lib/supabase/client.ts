import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
        return null;
    }

    return createBrowserClient(supabaseUrl, publishableKey);
}
