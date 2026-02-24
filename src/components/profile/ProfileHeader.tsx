'use client';

import { Avatar } from '@/components/Avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { FollowButton } from '@/components/FollowButton';

interface ProfileHeaderProps {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export function ProfileHeader({
  username,
  bio,
  avatarUrl,
  isOwner,
  isFollowing,
  followersCount,
  followingCount,
}: ProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-violet-500/5 dark:from-emerald-500/10 dark:to-violet-500/10" />
      <div className="relative px-6 pb-6 pt-8 sm:pt-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          <div className="flex flex-col items-center sm:items-start">
            {isOwner ? (
              <div className="ring-4 ring-white dark:ring-gray-950 ring-offset-2 dark:ring-offset-gray-950 rounded-full">
                <AvatarUpload username={username} avatarUrl={avatarUrl} compact size="xl" />
              </div>
            ) : (
              <div className="ring-4 ring-white dark:ring-gray-950 ring-offset-2 dark:ring-offset-gray-950 rounded-full">
                <Avatar username={username} avatarUrl={avatarUrl} size="xl" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white sm:text-3xl">
              @{username}
            </h1>
            {bio && (
              <p className="mt-1 max-w-lg text-gray-600 dark:text-gray-400">{bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">{followersCount}</span> followers
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">{followingCount}</span> following
              </span>
            </div>
            {!isOwner && (
              <div className="mt-4">
                <FollowButton username={username} initialFollowing={isFollowing} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
