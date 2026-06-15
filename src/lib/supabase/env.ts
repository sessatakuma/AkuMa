export function getSupabaseUrl() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!value) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
    }
    return value;
}

export function getSupabasePublishableKey() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!value) {
        throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured');
    }
    return value;
}

export function getSupabaseSecretKey() {
    const value = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!value) {
        throw new Error('SUPABASE_SECRET_KEY is not configured');
    }
    return value;
}
