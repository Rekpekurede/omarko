'use client';

import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { FollowButton } from '@/components/FollowButton';
import { ProfileEditForm } from './ProfileEditForm';

interface ProfileHeaderProps {
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export function ProfileHeader({
  username,
  displayName,
  bio,
  location,
  website,
  avatarUrl,
  isOwner,
  isFollowing,
  followersCount,
  followingCount,
}: ProfileHeaderProps) {
  const [editing, setEditing] = useState(false);

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
            {displayName && (
              <p className="mt-0.5 text-gray-600 dark:text-gray-400">{displayName}</p>
            )}
            {bio && !editing && (
              <p className="mt-1 max-w-lg text-gray-600 dark:text-gray-400">{bio}</p>
            )}
            {(location || website) && !editing && (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500 sm:justify-start dark:text-gray-400">
                {location && <span>{location}</span>}
                {website && (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
            {editing && (
              <ProfileEditForm
                initial={{ display_name: displayName, bio, location, website }}
                onCancel={() => setEditing(false)}
              />
            )}
            {!editing && (
              <>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{followersCount}</span> followers
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{followingCount}</span> following
                  </span>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-4 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Edit profile
                  </button>
                )}
                {!isOwner && (
                  <div className="mt-4">
                    <FollowButton username={username} initialFollowing={isFollowing} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
