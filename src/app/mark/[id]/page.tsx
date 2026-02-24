import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { Avatar } from '@/components/Avatar';
import { WithdrawContestButtons } from '@/components/WithdrawContestButtons';
import { MarkDetailTabs } from '@/components/MarkDetailTabs';
import { MarkContentWithEdit } from '@/components/MarkContentWithEdit';
import { BookmarkButton } from '@/components/BookmarkButton';
import { RelativeTime } from '@/components/RelativeTime';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const revalidate = 0;

export default async function MarkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: mark, error } = await supabase
    .from('marks')
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, owner_response, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', id)
    .single();

  if (error || !mark) notFound();

  const isWithdrawn = !!mark.withdrawn_at;
  let withdrawnByUsername: string | null = null;
  if (isWithdrawn && mark.withdrawn_by) {
    const { data: withdrawnByProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', mark.withdrawn_by)
      .single();
    withdrawnByUsername = withdrawnByProfile?.username ?? null;
  }

  const isOwner = !!user && user.id === mark.user_id;
  const { count: challengeCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('mark_id', id);
  const hasChallenges = (challengeCount ?? 0) > 0;
  const showOwnerActions = isOwner && !isWithdrawn;

  const { data: challenges } = await supabase
    .from('challenges')
    .select('id, challenger_id, evidence_text, evidence_url, claimed_original_date, is_evidence_backed, outcome, resolved_at, created_at, profiles!challenges_challenger_id_fkey(username)')
    .eq('mark_id', id)
    .order('created_at', { ascending: false });

  const { data: comments } = await supabase
    .from('comments')
    .select('id, user_id, content, created_at, profiles!comments_user_id_fkey(username)')
    .eq('mark_id', id)
    .order('created_at', { ascending: false });

  let currentVote: 'SUPPORT' | 'OPPOSE' | null = null;
  let canChallenge = !!user && user.id !== mark.user_id;
  const canVote = !!user && user.id !== mark.user_id;
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

  const profilesData = (mark as { profiles?: { username: string; avatar_url?: string | null } | { username: string; avatar_url?: string | null }[] | null }).profiles;
  const profileObj = Array.isArray(profilesData) ? profilesData[0] : profilesData;
  const displayUsername = profileObj?.username ?? 'unknown';
  const avatarUrl = profileObj?.avatar_url ?? null;
  const content = (mark as { content?: string }).content ?? '';

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

  const currentTab = tab === 'comments' ? 'comments' : tab === 'challenges' ? 'challenges' : tab === 'versions' ? 'versions' : 'overview';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Avatar username={displayUsername} avatarUrl={avatarUrl} size="md" />
              <div>
                <Link href={`/profile/${displayUsername}`} className="font-semibold text-black hover:underline dark:text-white">
                  @{displayUsername}
                </Link>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  {(mark as { domain?: string }).domain}
                  {(mark as { claim_type?: string }).claim_type && ` · ${(mark as { claim_type: string }).claim_type}`}
                  {' · '}
                  <RelativeTime dateString={mark.created_at} />
                  {mark.updated_at && new Date(mark.updated_at).getTime() !== new Date(mark.created_at).getTime() && (
                    <> · Updated <RelativeTime dateString={mark.updated_at} /></>
                  )}
                </span>
              </div>
              {isWithdrawn && (
                <span className="inline-flex items-center rounded bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-800">
                  WITHDRAWN
                </span>
              )}
            </div>
            {isWithdrawn && withdrawnByUsername && (
              <p className="mt-1 text-sm text-gray-600">Withdrawn by @{withdrawnByUsername}</p>
            )}
            <MarkContentWithEdit
              content={content}
              markId={mark.id}
              canEdit={isOwner && !hasChallenges && !isWithdrawn}
            />
            {versionCount > 0 && (
              <p className="mt-2">
                <Link href={`/mark/${id}?tab=versions`} className="text-sm text-gray-500 hover:underline">
                  Edited ({versionCount})
                </Link>
              </p>
            )}
          </div>
          <StatusBadge status={mark.status as import('@/lib/types').MarkStatus} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {user && <BookmarkButton markId={mark.id} bookmarked={isBookmarked} />}
          <span className="text-sm text-gray-500 dark:text-gray-400">Support: {mark.support_votes ?? 0}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Oppose: {mark.oppose_votes ?? 0}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Challenges: {mark.dispute_count ?? 0}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Disputes: {mark.disputes_survived ?? 0}</span>
          {!isWithdrawn && user && <VoteButtons markId={mark.id} canVote={canVote} currentVote={currentVote} />}
          {isWithdrawn && (
            <span className="text-sm text-gray-400" title="Voting and disputing are disabled for withdrawn marks">
              Voting and disputing disabled
            </span>
          )}
        </div>
        {showOwnerActions && (
          <div className="mt-4 rounded border border-amber-200 bg-amber-50/50 p-3">
            {hasChallenges ? (
              <h3 className="mb-2 text-sm font-semibold text-amber-900">This mark has challenges</h3>
            ) : (
              <h3 className="mb-2 text-sm font-semibold text-amber-900">Owner actions</h3>
            )}
            <WithdrawContestButtons markId={mark.id} hasChallenges={hasChallenges} />
          </div>
        )}
      </div>

      <MarkDetailTabs
        markId={id}
        currentTab={currentTab}
        challenges={challenges ?? []}
        comments={comments ?? []}
        canChallenge={canChallenge}
        isWithdrawn={isWithdrawn}
        currentUserId={user?.id ?? null}
        versionCount={versionCount}
        canEdit={isOwner && !hasChallenges && !isWithdrawn}
        challengeCount={challengeCount ?? 0}
      />

      {mark.owner_response && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-lg font-semibold dark:text-white">Owner response</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{mark.owner_response}</p>
        </div>
      )}
    </div>
  );
}
