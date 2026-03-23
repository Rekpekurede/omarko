import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MarkStatusLabel } from '@/components/MarkStatusLabel';
import { VoteButtons } from '@/components/VoteButtons';
import { Avatar } from '@/components/Avatar';
import { WithdrawContestButtons } from '@/components/WithdrawContestButtons';
import { MarkDetailTabs } from '@/components/MarkDetailTabs';
import { MarkContentWithEdit } from '@/components/MarkContentWithEdit';
import { BookmarkButton } from '@/components/BookmarkButton';
import { RelativeTime } from '@/components/RelativeTime';
import { PageContainer } from '@/components/PageContainer';
import { getSignedMediaForMarkIds } from '@/lib/markMedia';
import { DOMAIN_BADGE_CLASS, DOMAIN_DEFAULT } from '@/lib/markDomainBadge';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string }>;
}

export const revalidate = 0;

export default async function MarkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab, edit } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: mark, error } = await supabase
    .from('marks')
    .select('id, user_id, historical_profile_id, content, image_url, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, owner_response, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url, display_name), historical_profiles(name)')
    .eq('id', id)
    .single();

  if (error || !mark) notFound();

  const isWithdrawn = !!mark.withdrawn_at;
  const isRemovedNotAMark = false;
  let withdrawnByUsername: string | null = null;
  if (isWithdrawn && mark.withdrawn_by) {
    const { data: withdrawnByProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', mark.withdrawn_by)
      .single();
    withdrawnByUsername = withdrawnByProfile?.username ?? null;
  }

  const isHistorical = !!mark.historical_profile_id;
  const historicalName = (() => {
    const h = (mark as { historical_profiles?: { name?: string } | { name?: string }[] | null }).historical_profiles;
    if (!h) return null;
    const o = Array.isArray(h) ? h[0] : h;
    return o?.name ?? null;
  })();
  const isOwner = !!user && user.id === mark.user_id;
  const { count: challengeCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('mark_id', id);
  const hasChallenges = (challengeCount ?? 0) > 0;

  const { data: challenges } = await supabase
    .from('challenges')
    .select('id, challenger_id, evidence_text, evidence_url, claimed_original_date, is_evidence_backed, outcome, resolved_at, created_at, profiles!challenges_challenger_id_fkey(username, display_name)')
    .eq('mark_id', id)
    .order('created_at', { ascending: false });

  const { data: comments } = await supabase
    .from('comments')
    .select('id, user_id, content, created_at, profiles!comments_user_id_fkey(username, display_name)')
    .eq('mark_id', id)
    .order('created_at', { ascending: false });

  let currentVote: 'SUPPORT' | 'OPPOSE' | null = null;
  let canChallenge = !isHistorical && !!user && user.id !== mark.user_id;
  const canVote = !!user;
  if (user) {
    const { data: vote } = await supabase
      .from('votes')
      .select('id, vote_type')
      .eq('mark_id', id)
      .eq('voter_id', user.id)
      .maybeSingle();
    currentVote = (vote?.vote_type as 'SUPPORT' | 'OPPOSE') ?? null;
    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id')
      .eq('mark_id', id)
      .eq('challenger_id', user.id)
      .maybeSingle();
    if (existingChallenge) canChallenge = false;
  }

  const profilesData = (mark as { profiles?: { username: string; avatar_url?: string | null; display_name?: string | null } | { username: string; avatar_url?: string | null; display_name?: string | null }[] | null }).profiles;
  const profileObj = Array.isArray(profilesData) ? profilesData[0] : profilesData;
  const username = profileObj?.username ?? 'unknown';
  const displayUsername = isHistorical && historicalName ? historicalName : username;
  const displayNameTrimmed = profileObj?.display_name?.trim() ?? '';
  const displayPrimary = !isHistorical && displayNameTrimmed ? displayNameTrimmed : `@${displayUsername}`;
  const showSecondaryUsername = !isHistorical && !!displayNameTrimmed;
  const avatarUrl = profileObj?.avatar_url ?? null;
  const showOwnerActions = isOwner && !isWithdrawn && !isHistorical && !isRemovedNotAMark;
  const content = (mark as { content?: string }).content ?? '';
  const imageUrl = (mark as { image_url?: string | null }).image_url ?? null;
  const domainLabel = (mark as { domain?: string }).domain;
  const domainBadgeClass =
    domainLabel && DOMAIN_BADGE_CLASS[domainLabel] ? DOMAIN_BADGE_CLASS[domainLabel] : DOMAIN_DEFAULT;
  const hasBeenEdited = !!(
    mark.updated_at &&
    new Date(mark.updated_at).getTime() !== new Date(mark.created_at).getTime()
  );
  const canEditMark = isOwner && !hasChallenges && !isWithdrawn && !isRemovedNotAMark;
  const mediaByMarkId = await getSignedMediaForMarkIds(supabase, [id]);
  const media = mediaByMarkId[id] ?? [];

  const { data: versions } = await supabase
    .from('mark_versions')
    .select('id')
    .eq('mark_id', id);
  const versionCount = versions?.length ?? 0;

  let isBookmarked = false;
  if (user) {
    const { data: b } = await supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('mark_id', id).maybeSingle();
    isBookmarked = !!b;
  }

  const currentTab = tab === 'comments' ? 'comments' : tab === 'challenges' ? 'challenges' : tab === 'versions' ? 'versions' : tab === 'soi' ? 'soi' : 'overview';

  let soiCount = 0;
  try {
    const { count: soiCountResult } = await supabase
      .from('signs_of_influence')
      .select('id', { count: 'exact', head: true })
      .eq('mark_id', id);
    soiCount = soiCountResult ?? 0;
  } catch {
    soiCount = 0;
  }

  const challengesCount = mark.dispute_count ?? 0;
  const survivedCount = mark.disputes_survived ?? 0;

  return (
    <PageContainer className="space-y-8">
      {/* Section 1–5: main mark card */}
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6"
        data-status={mark.status}
      >
        {/* Section 1: header — identity, tags, bookmark / status top-right */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <Avatar username={displayUsername} avatarUrl={isHistorical ? null : avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              {isHistorical && mark.historical_profile_id ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <Link
                      href={`/historical/profile/${mark.historical_profile_id}`}
                      className="mark-card-display-name text-[16px] font-semibold text-[var(--text-primary)] hover:underline"
                    >
                      {displayUsername}
                    </Link>
                    <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-[12px] text-[var(--text-muted)] tabular-nums">
                      <RelativeTime dateString={mark.created_at} />
                      {hasBeenEdited && (
                        <>
                          <span className="text-[var(--text-muted)]/50" aria-hidden>
                            ·
                          </span>
                          <span className="text-[11px]">
                            Edited <RelativeTime dateString={mark.updated_at!} />
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/70 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    HISTORICAL FIGURE
                  </span>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <Link
                      href={`/profile/${encodeURIComponent(username)}`}
                      className="mark-card-display-name min-w-0 truncate text-[16px] font-semibold text-[var(--text-primary)] hover:underline"
                    >
                      {displayPrimary}
                    </Link>
                    <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 text-[12px] text-[var(--text-muted)] tabular-nums shrink-0">
                      <RelativeTime dateString={mark.created_at} />
                      {hasBeenEdited && (
                        <>
                          <span className="text-[var(--text-muted)]/50" aria-hidden>
                            ·
                          </span>
                          <span className="text-[11px]">
                            Edited <RelativeTime dateString={mark.updated_at!} />
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  {showSecondaryUsername && (
                    <Link
                      href={`/profile/${encodeURIComponent(username)}`}
                      className="mt-0.5 block text-[13px] text-[var(--text-muted)] opacity-65 hover:underline"
                    >
                      @{username}
                    </Link>
                  )}
                </>
              )}
              {(mark.claim_type || domainLabel) && (
                <div className="mark-detail-header badge-row mt-3">
                  {mark.claim_type && <span className="badge-claim-type">{mark.claim_type}</span>}
                  {domainLabel && (
                    <span className={`badge-domain ${domainBadgeClass}`} data-domain={domainLabel}>
                      {domainLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1 sm:gap-2">
            {user && (
              <BookmarkButton markId={mark.id} bookmarked={isBookmarked} iconOnly className="-mr-1 sm:mr-0" />
            )}
            {(mark.status !== 'ACTIVE' || isRemovedNotAMark) && (
              <MarkStatusLabel
                status={mark.status as import('@/lib/types').MarkStatus}
              />
            )}
            {isWithdrawn && <span className="text-xs text-muted-foreground sm:whitespace-nowrap">Withdrawn</span>}
          </div>
        </div>

        {isWithdrawn && withdrawnByUsername && (
          <p className="mt-2 text-sm text-muted-foreground">Withdrawn by @{withdrawnByUsername}</p>
        )}

        {/* Section 2: content only */}
        <div className="mt-8 md:mt-10">
          {isRemovedNotAMark ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This post was removed because it did not qualify as a mark on OMarko.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Marks on OMarko should clearly express a claim, contribution, prediction, argument, observation, naming, diagnosis, question, rule, petition, or creation.
              </p>
            </div>
          ) : (
            <MarkContentWithEdit
              content={content}
              imageUrl={imageUrl}
              media={media}
              markId={mark.id}
              canEdit={canEditMark}
              initialEdit={tab === 'edit' || edit === '1'}
              hideInlineEditButton={canEditMark}
            />
          )}
          {versionCount > 0 && (
            <p className="mt-4">
              <Link
                href={`/mark/${id}?tab=versions`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Version history ({versionCount})
              </Link>
            </p>
          )}
        </div>

        {/* Sections 3–4: stats + vote actions */}
        <VoteButtons
          markId={mark.id}
          canVote={canVote}
          isOwnMark={isOwner}
          currentVote={currentVote}
          initialSupportVotes={mark.support_votes ?? 0}
          initialOpposeVotes={mark.oppose_votes ?? 0}
          challengeCount={challengesCount}
          disputesSurvived={survivedCount}
          soiCount={soiCount}
          isWithdrawn={isWithdrawn}
        />

        {/* Section 5: owner — quiet inline links */}
        {showOwnerActions && (
          <div className="mt-4 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {canEditMark && (
              <Link
                href={`/mark/${id}?edit=1`}
                className="font-normal underline-offset-2 transition hover:text-foreground hover:underline"
              >
                Edit
              </Link>
            )}
            {canEditMark && (
              <span className="text-muted-foreground/40 select-none" aria-hidden>
                ·
              </span>
            )}
            <WithdrawContestButtons markId={mark.id} hasChallenges={hasChallenges} quietInline />
          </div>
        )}
      </div>

      {/* Section 7: tabs in separate card */}
      <MarkDetailTabs
        markId={id}
        currentTab={currentTab}
        challenges={challenges ?? []}
        comments={comments ?? []}
        canChallenge={canChallenge}
        challengeDisabledReason={isHistorical ? 'Challenges on historical marks are reviewed by designated custodians.' : undefined}
        isWithdrawn={isWithdrawn}
        currentUserId={user?.id ?? null}
        versionCount={versionCount}
        canEdit={canEditMark}
        challengeCount={challengeCount ?? 0}
        soiCount={soiCount}
        isOwner={isOwner}
        canAddSoi={isHistorical ? !!user : (isOwner && !isWithdrawn)}
      />

      {mark.owner_response && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">Owner response</h2>
          <p className="text-base leading-relaxed text-foreground">{mark.owner_response}</p>
        </div>
      )}
    </PageContainer>
  );
}
