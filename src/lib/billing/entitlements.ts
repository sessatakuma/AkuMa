import { getExtensionBearerToken, validateExtensionToken } from '../auth/extensionTokens';
import { createSupabaseAuthClient, createSupabaseServiceClient } from '../supabase/server';

import type { User } from '@supabase/supabase-js';

export const FREE_DAILY_USAGE_CAP = 50;
export const MAX_ANNOTATION_TEXT_CHARS = 10_000;
export const PRO_CHARACTERS_PER_DAY_LIMIT = 1_000_000;
export const PRO_REQUESTS_PER_DAY_LIMIT = 10_000;
export const PRO_REQUESTS_PER_HOUR_LIMIT = 1_000;
export const PRO_REQUESTS_PER_MINUTE_LIMIT = 60;

export type Plan = 'free' | 'pro';

export interface EntitlementSnapshot {
    plan: Plan;
    usageCount: number;
    usageLimit: number;
}

export interface AuthenticatedAccount {
    accessToken?: string;
    user?: User;
    userId: string;
}

interface SubscriptionRow {
    current_period_end: string | null;
    status: string;
}

interface UsageRow {
    count: number;
}

type AccessDeniedReason =
    | 'characters-day'
    | 'free-daily-cap'
    | 'free-word-only'
    | 'rate-day'
    | 'rate-hour'
    | 'rate-minute'
    | 'text-too-long';

interface ProUsageResult {
    annotation_event_id: string | null;
    allowed: boolean;
    day_character_count: number;
    day_count: number;
    hour_count: number;
    minute_count: number;
    reason: AccessDeniedReason | null;
}

export type UsageReservation =
    | {
          kind: 'free';
          usageDate: string;
      }
    | {
          annotationEventId: string;
          kind: 'pro';
      };

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

export function getBearerToken(request: Request) {
    const header = request.headers.get('authorization');
    if (!header) {
        return null;
    }

    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match?.[1] ?? null;
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedAccount | null> {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
        return null;
    }

    const extensionToken = getExtensionBearerToken(request);
    if (extensionToken) {
        const extensionAccount = await validateExtensionToken(extensionToken);
        if (!extensionAccount) {
            return null;
        }

        return {
            userId: extensionAccount.userId,
        };
    }

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
        return null;
    }

    return {
        accessToken,
        userId: data.user.id,
        user: data.user,
    };
}

export async function getEntitlementSnapshot(userId: string): Promise<EntitlementSnapshot> {
    const supabase = createSupabaseServiceClient();
    const [subscriptionResult, usageResult] = await Promise.all([
        supabase
            .from('akuma_subscriptions')
            .select('status,current_period_end')
            .eq('user_id', userId)
            .maybeSingle<SubscriptionRow>(),
        supabase
            .from('akuma_daily_usage')
            .select('count')
            .eq('user_id', userId)
            .eq('usage_date', getUtcUsageDate())
            .maybeSingle<UsageRow>(),
    ]);

    if (subscriptionResult.error) {
        throw subscriptionResult.error;
    }

    if (usageResult.error) {
        throw usageResult.error;
    }

    return {
        plan: isProSubscription(subscriptionResult.data) ? 'pro' : 'free',
        usageCount: usageResult.data?.count ?? 0,
        usageLimit: FREE_DAILY_USAGE_CAP,
    };
}

export async function assertCanUseAccentApi(userId: string, text: string) {
    const snapshot = await getEntitlementSnapshot(userId);
    const characterCount = [...text.trim()].length;

    if (characterCount > MAX_ANNOTATION_TEXT_CHARS) {
        return {
            allowed: false,
            reason: 'text-too-long' as const,
            snapshot,
        };
    }

    if (snapshot.plan === 'pro') {
        return assertProFairUse(userId, characterCount, snapshot);
    }

    if (!isSingleJapaneseWord(text)) {
        return {
            allowed: false,
            reason: 'free-word-only' as const,
            snapshot,
        };
    }

    const usageDate = getUtcUsageDate();
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .schema('private')
        .rpc('increment_akuma_daily_usage', {
            free_daily_cap: FREE_DAILY_USAGE_CAP,
            target_usage_date: usageDate,
            target_user_id: userId,
        })
        .single<{ allowed: boolean; usage_count: number }>();

    if (error) {
        throw error;
    }

    const usageCount = data?.usage_count ?? snapshot.usageCount;
    const nextSnapshot = {
        ...snapshot,
        usageCount,
    };

    return {
        allowed: Boolean(data?.allowed),
        reason: data?.allowed ? undefined : ('free-daily-cap' as const),
        reservation: data?.allowed ? ({ kind: 'free', usageDate } satisfies UsageReservation) : undefined,
        snapshot: nextSnapshot,
    };
}

async function assertProFairUse(
    userId: string,
    characterCount: number,
    snapshot: EntitlementSnapshot,
) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
        .schema('private')
        .rpc('record_akuma_pro_annotation_usage', {
            per_day_character_limit: PRO_CHARACTERS_PER_DAY_LIMIT,
            per_day_limit: PRO_REQUESTS_PER_DAY_LIMIT,
            per_hour_limit: PRO_REQUESTS_PER_HOUR_LIMIT,
            per_minute_limit: PRO_REQUESTS_PER_MINUTE_LIMIT,
            target_character_count: characterCount,
            target_user_id: userId,
        })
        .single<ProUsageResult>();

    if (error) {
        throw error;
    }

    if (data?.allowed && !data.annotation_event_id) {
        throw new Error('Pro annotation usage was allowed without a usage event id');
    }

    return {
        allowed: Boolean(data?.allowed),
        proUsage: data,
        reason: data?.allowed ? undefined : (data?.reason ?? 'rate-minute'),
        reservation:
            data?.allowed && data.annotation_event_id
                ? ({
                      annotationEventId: data.annotation_event_id,
                      kind: 'pro',
                  } satisfies UsageReservation)
                : undefined,
        snapshot,
    };
}

export async function rollbackAccentApiUsage(userId: string, reservation: UsageReservation | undefined) {
    if (!reservation) {
        return;
    }

    const supabase = createSupabaseServiceClient();

    if (reservation.kind === 'free') {
        const { error } = await supabase
            .schema('private')
            .rpc('decrement_akuma_daily_usage', {
                target_usage_date: reservation.usageDate,
                target_user_id: userId,
            })
            .single<{ usage_count: number }>();

        if (error) {
            throw error;
        }
        return;
    }

    const { error } = await supabase.schema('private').rpc('delete_akuma_annotation_event', {
        target_event_id: reservation.annotationEventId,
        target_user_id: userId,
    });

    if (error) {
        throw error;
    }
}

export function getUtcUsageDate(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

export function isSingleJapaneseWord(text: string) {
    const trimmed = text.trim();
    if (!/[\u3040-\u30ff\u3400-\u9fff]/u.test(trimmed)) {
        return false;
    }

    if (/\s/u.test(trimmed)) {
        return false;
    }

    const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
    const wordLikeSegments = [...segmenter.segment(trimmed)].filter(segment => segment.isWordLike);

    return wordLikeSegments.length === 1 && wordLikeSegments[0]?.segment === trimmed;
}

function isProSubscription(subscription: SubscriptionRow | null) {
    if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        return false;
    }

    if (!subscription.current_period_end) {
        return true;
    }

    return new Date(subscription.current_period_end).getTime() > Date.now();
}
