'use client';

import { useEffect, useState } from 'react';
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
  const [localDisplayName, setLocalDisplayName] = useState<string | null>(displayName);
  const [localBio, setLocalBio] = useState<string | null>(bio);
  const [localLocation, setLocalLocation] = useState<string | null>(location);
  const [localWebsite, setLocalWebsite] = useState<string | null>(website);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(avatarUrl);

  useEffect(() => {
    setLocalDisplayName(displayName);
    setLocalBio(bio);
    setLocalLocation(location);
    setLocalWebsite(website);
    setLocalAvatarUrl(avatarUrl);
  }, [displayName, bio, location, website, avatarUrl, username]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-violet-500/5 dark:from-emerald-500/10 dark:to-violet-500/10" />
      <div className="relative px-6 pb-6 pt-8 sm:pt-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          <div className="flex flex-col items-center sm:items-start">
            {isOwner ? (
              <div className="ring-4 ring-white dark:ring-gray-950 ring-offset-2 dark:ring-offset-gray-950 rounded-full">
                <AvatarUpload
                  username={username}
                  avatarUrl={localAvatarUrl}
                  compact
                  size="xl"
                  onUploaded={(nextUrl) => setLocalAvatarUrl(nextUrl)}
                />
              </div>
            ) : (
              <div className="ring-4 ring-white dark:ring-gray-950 ring-offset-2 dark:ring-offset-gray-950 rounded-full">
                <Avatar username={username} avatarUrl={localAvatarUrl} size="xl" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white sm:text-3xl">
              @{username}
            </h1>
            {localDisplayName && (
              <p className="mt-0.5 text-gray-600 dark:text-gray-400">{localDisplayName}</p>
            )}
            {localBio && !editing && (
              <p className="mt-1 max-w-lg text-gray-600 dark:text-gray-400">{localBio}</p>
            )}
            {(localLocation || localWebsite) && !editing && (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500 sm:justify-start dark:text-gray-400">
                {localLocation && <span>{localLocation}</span>}
                {localWebsite && (
                  <a href={localWebsite.startsWith('http') ? localWebsite : `https://${localWebsite}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {localWebsite.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
            {editing && (
              <ProfileEditForm
                initial={{ display_name: localDisplayName, bio: localBio, location: localLocation, website: localWebsite }}
                onSaved={(next) => {
                  setLocalDisplayName(next.display_name);
                  setLocalBio(next.bio);
                  setLocalLocation(next.location);
                  setLocalWebsite(next.website);
                }}
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
