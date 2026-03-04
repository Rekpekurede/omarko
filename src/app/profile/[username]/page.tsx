import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MarkCard } from '@/components/MarkCard';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { PostingDefaultsSection } from '@/components/profile/PostingDefaultsSection';
import { PageContainer } from '@/components/PageContainer';
import { DOMAINS } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

const PROFILE_MARKS_LIMIT = 20;
const SUPPORTED_LIMIT = 20;

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ domain?: string; claim_type?: string; disputed_only?: string; tab?: string }>;
}

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function ProfileNotFound({ username }: { username: string }) {
  return (
    <PageContainer>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">Profile not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No profile found for @{username}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-foreground hover:underline">
          Back to feed
        </Link>
      </div>
    </PageContainer>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <PageContainer>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-red-800">Something went wrong</h1>
        <p className="mt-2 text-red-600">{message}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Back to feed
        </Link>
      </div>
    </PageContainer>
  );
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const uname = decodeURIComponent((await params).username);
  const { domain, claim_type, disputed_only, tab } = await searchParams;

  let profile: { id: string; username: string; display_name?: string | null; bio?: string | null; location?: string | null; website?: string | null; avatar_url?: string | null; default_domain?: string | null; default_claim_type?: string | null; disputes_raised?: number; disputes_won?: number; disputes_lost?: number; disputes_conceded?: number } | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: claimTypeOptions } = await supabase
      .from('claim_types')
      .select('id, name')
      .order('name', { ascending: true });
    const claimTypeIdToName = new Map((claimTypeOptions ?? []).map((x) => [x.id, x.name]));

    // Profile lookup: RPC first (bypasses RLS), fallback to direct query with ilike
    let profileRows: { id: string; username: string; display_name?: string | null; bio?: string | null; location?: string | null; website?: string | null; avatar_url?: string | null; default_domain?: string | null; default_claim_type?: string | null; disputes_raised?: number; disputes_won?: number; disputes_lost?: number; disputes_conceded?: number }[] | null = null;
    let profileError: unknown = null;
    let profileSource: 'rpc' | 'direct' | 'none' = 'none';

    try {
      const rpcRes = await supabase.rpc('get_profile_by_username', { p_username: uname });
      profileError = rpcRes.error;
      profileRows = rpcRes.data;
    } catch (rpcErr) {
      console.error('[ProfilePage] profile RPC error', rpcErr);
      profileError = rpcErr;
    }

    if (profileError) {
      console.error('[ProfilePage] profile lookup error', profileError);
    }

    profile = profileRows?.[0] ?? null;
    if (profile) profileSource = 'rpc';

    // Fallback: direct profiles query (case-insensitive via ilike)
    if (!profile) {
      try {
        const { data: directRows } = await supabase
          .from('profiles')
          .select('id, username, display_name, bio, location, website, avatar_url, default_domain, default_claim_type, disputes_raised, disputes_won, disputes_lost, disputes_conceded')
          .ilike('username', uname)
          .limit(1);
        profile = directRows?.[0] ?? null;
        if (profile) profileSource = 'direct';
      } catch (directErr) {
        console.error('[ProfilePage] profile direct fallback error', directErr);
      }
    }

    if (!profile) {
      return <ProfileNotFound username={uname} />;
    }
    // Hydrate core fields from direct table read to avoid stale RPC/schema cache values.
    try {
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, display_name, location, website, default_domain, default_claim_type')
        .eq('id', profile.id)
        .maybeSingle();
      if (freshProfile) {
        profile = { ...profile, ...freshProfile };
      }
    } catch (freshErr) {
      console.error('[ProfilePage] profile hydrate error', freshErr);
    }
    console.log('[ProfilePage] resolved profile', {
      username: profile.username,
      source: profileSource,
      hasBio: !!profile.bio,
      hasAvatarUrl: !!profile.avatar_url,
    });

    const isOwner = !!user && user.id === profile.id;
    const currentTab = (tab === 'challenges' || tab === 'comments' || tab === 'supported') ? tab : 'marks';

    let followersCount = 0;
    let followingCount = 0;
    let isFollowing = false;
    try {
      const [followersRes, followingRes, followRow] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
        user ? supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      followersCount = followersRes.count ?? 0;
      followingCount = followingRes.count ?? 0;
      isFollowing = !!followRow.data;
    } catch {
      // follows table may not exist yet
    }

    // Marks query (profiles!marks_user_id_fkey already in MARK_WITH_OWNER_USERNAME_SELECT)
    let marksWithProfile: Array<Record<string, unknown> & { id: string; profiles?: { username: string } }> = [];
    let marksNextCursor: string | null = null;
    let totalMarks: number | null = null;
    let champions = 0;
    let supplanted = 0;
    let supportedMarks: typeof marksWithProfile = [];
    let supportedNextCursor: string | null = null;
    let challenges: Array<{ id: string; mark_id: string; evidence_text: string; outcome?: string; created_at: string }> = [];
    let comments: Array<{ id: string; mark_id: string; content: string; created_at: string }> = [];
    let withdrawnMarks: typeof marksWithProfile = [];

    try {
      let marksQuery = supabase
        .from('marks')
        .select(MARK_WITH_OWNER_USERNAME_SELECT)
        .eq('user_id', profile.id)
        .is('withdrawn_at', null)
        .order('created_at', { ascending: false })
        .limit(PROFILE_MARKS_LIMIT);

      if (domain && domain !== 'all' && DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
        marksQuery = marksQuery.eq('domain', domain);
      }
      if (claim_type && claim_type !== 'all') {
        const claimTypeName = claimTypeIdToName.get(claim_type) ?? claim_type;
        marksQuery = marksQuery.eq('claim_type', claimTypeName);
      }
      if (disputed_only === 'true') {
        marksQuery = marksQuery.gt('dispute_count', 0);
      }

      const { data: marks, error: marksErr } = await marksQuery;
      if (marksErr) {
        console.error('[ProfilePage] marks query error', marksErr);
      } else {
        const list = (marks ?? []).map((m) => ({ ...m, profiles: { username: profile!.username, avatar_url: profile!.avatar_url } }));
        const markIds = list.map((m) => m.id);
        const commentsCountMap: Record<string, number> = {};
        if (markIds.length > 0) {
          const { data: commentRows, error: commentsErr } = await supabase
            .from('comments')
            .select('mark_id')
            .in('mark_id', markIds);
          if (!commentsErr) {
            for (const row of commentRows ?? []) {
              commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
            }
          }
        }
        marksWithProfile = list.map((m) => ({ ...m, comments_count: commentsCountMap[m.id] ?? 0 }));
        marksNextCursor = marksWithProfile.length === PROFILE_MARKS_LIMIT && marksWithProfile[marksWithProfile.length - 1]
          ? marksWithProfile[marksWithProfile.length - 1].id
          : null;
      }
    } catch (marksErr) {
      console.error('[ProfilePage] marks query error', marksErr);
    }

    try {
      const { count } = await supabase
        .from('marks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('withdrawn_at', null);
      totalMarks = count ?? 0;
    } catch {
      totalMarks = 0;
    }

    try {
      const { data: allForStats } = await supabase
        .from('marks')
        .select('status')
        .eq('user_id', profile.id)
        .is('withdrawn_at', null);
      champions = (allForStats ?? []).filter((m) => m.status === 'CHAMPION').length;
      supplanted = (allForStats ?? []).filter((m) => m.status === 'SUPPLANTED').length;
    } catch {
      // ignore
    }

    try {
      const { data: supportedVotes } = await supabase
        .from('votes')
        .select('mark_id')
        .eq('voter_id', profile.id)
        .eq('vote_type', 'SUPPORT')
        .order('created_at', { ascending: false })
        .limit(SUPPORTED_LIMIT);
      const supportedMarkIds = (supportedVotes ?? []).map((v) => v.mark_id);
      if (supportedMarkIds.length > 0) {
        const { data: sm } = await supabase
          .from('marks')
          .select(MARK_WITH_OWNER_USERNAME_SELECT)
          .in('id', supportedMarkIds)
          .is('withdrawn_at', null);
        const orderMap = new Map(supportedMarkIds.map((id, i) => [id, i]));
        const sorted = (sm ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        const commentsCountMap: Record<string, number> = {};
        if (supportedMarkIds.length > 0) {
          const { data: commentRows, error: commentsErr } = await supabase
            .from('comments')
            .select('mark_id')
            .in('mark_id', supportedMarkIds);
          if (!commentsErr) {
            for (const row of commentRows ?? []) {
              commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
            }
          }
        }
        supportedMarks = sorted.map((m) => {
          const p = m.profiles as { username?: string; avatar_url?: string | null } | { username?: string; avatar_url?: string | null }[] | null;
          const u = (p && (Array.isArray(p) ? p[0]?.username : p.username)) ?? profile!.username;
          const av = (p && (Array.isArray(p) ? p[0]?.avatar_url : p.avatar_url)) ?? profile!.avatar_url;
          return { ...m, profiles: { username: u, avatar_url: av }, comments_count: commentsCountMap[m.id] ?? 0 };
        });
      }
      supportedNextCursor = supportedMarkIds.length === SUPPORTED_LIMIT && supportedMarkIds[supportedMarkIds.length - 1]
        ? supportedMarkIds[supportedMarkIds.length - 1]
        : null;
    } catch (err) {
      console.error('[ProfilePage] supported marks error', err);
    }

    try {
      const { data: ch } = await supabase
        .from('challenges')
        .select('id, mark_id, evidence_text, outcome, created_at')
        .eq('challenger_id', profile.id)
        .order('created_at', { ascending: false });
      challenges = ch ?? [];
    } catch (err) {
      console.error('[ProfilePage] challenges error', err);
    }

    try {
      const { data: cm } = await supabase
        .from('comments')
        .select('id, mark_id, content, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      comments = cm ?? [];
    } catch (err) {
      console.error('[ProfilePage] comments error', err);
    }

    if (isOwner) {
      try {
        const { data: withdrawn } = await supabase
          .from('marks')
          .select(MARK_WITH_OWNER_USERNAME_SELECT)
          .eq('user_id', profile.id)
          .not('withdrawn_at', 'is', null)
          .order('withdrawn_at', { ascending: false });
        const withdrawnIds = (withdrawn ?? []).map((m) => m.id);
        const commentsCountMap: Record<string, number> = {};
        if (withdrawnIds.length > 0) {
          const { data: commentRows, error: commentsErr } = await supabase
            .from('comments')
            .select('mark_id')
            .in('mark_id', withdrawnIds);
          if (!commentsErr) {
            for (const row of commentRows ?? []) {
              commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
            }
          }
        }
        withdrawnMarks = (withdrawn ?? []).map((m) => ({
          ...m,
          profiles: { username: profile!.username, avatar_url: profile!.avatar_url },
          comments_count: commentsCountMap[m.id] ?? 0,
        }));
      } catch (err) {
        console.error('[ProfilePage] withdrawn marks error', err);
      }
    }

    return (
      <PageContainer className="space-y-6">
        <ProfileHeader
          username={profile.username}
          displayName={profile.display_name ?? null}
          bio={profile.bio ?? null}
          location={profile.location ?? null}
          website={profile.website ?? null}
          avatarUrl={profile.avatar_url ?? null}
          isOwner={isOwner}
          isFollowing={isFollowing}
          followersCount={followersCount}
          followingCount={followingCount}
        />
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Stats</h2>
          <ProfileStats
            totalMarks={totalMarks ?? 0}
            champions={champions}
            supplanted={supplanted}
            disputesRaised={profile.disputes_raised ?? 0}
            disputesWon={profile.disputes_won ?? 0}
            disputesLost={profile.disputes_lost ?? 0}
            disputesConceded={profile.disputes_conceded ?? 0}
          />
        </div>
        {isOwner && (
          <PostingDefaultsSection
            initialDefaultDomain={profile.default_domain ?? null}
            initialDefaultClaimType={profile.default_claim_type ?? null}
          />
        )}
        <div>
          <ProfileTabs
            username={profile.username}
            currentTab={currentTab}
            marks={marksWithProfile as unknown as import('@/lib/types').Mark[]}
            marksNextCursor={marksNextCursor}
            domain={domain ?? 'all'}
            claimType={claim_type ?? 'all'}
            claimTypeOptions={claimTypeOptions ?? []}
            challengedOnly={disputed_only === 'true'}
            supportedMarks={supportedMarks as unknown as import('@/lib/types').Mark[]}
            supportedNextCursor={supportedNextCursor}
            challenges={challenges}
            comments={comments}
            currentUserId={user?.id ?? null}
          />
        </div>

        {isOwner && withdrawnMarks.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">My Withdrawn</h2>
            <ul className="space-y-4">
              {withdrawnMarks.map((mark) => (
                <li key={mark.id}>
                  <MarkCard mark={mark as unknown as import('@/lib/types').Mark} showChallengeButton={false} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </PageContainer>
    );
  } catch (err) {
    console.error('[ProfilePage] unexpected error', err);
    return (
      <ProfileError
        message={err instanceof Error ? err.message : 'Failed to load profile. Please try again.'}
      />
    );
  }
}
