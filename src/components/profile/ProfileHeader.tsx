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
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="relative">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end">
          <div className="flex flex-col items-center sm:items-start">
            {isOwner ? (
              <div className="rounded-full ring-2 ring-border ring-offset-2 ring-offset-background">
                <AvatarUpload
                  username={username}
                  avatarUrl={localAvatarUrl}
                  compact
                  size="xl"
                  onUploaded={(nextUrl) => setLocalAvatarUrl(nextUrl)}
                />
              </div>
            ) : (
              <div className="rounded-full ring-2 ring-border ring-offset-2 ring-offset-background">
                <Avatar username={username} avatarUrl={localAvatarUrl} size="xl" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              @{username}
            </h1>
            {localDisplayName && (
              <p className="mt-0.5 text-sm text-muted-foreground">{localDisplayName}</p>
            )}
            {localBio && !editing && (
              <p className="mt-2 max-w-lg text-base leading-relaxed text-foreground">{localBio}</p>
            )}
            {(localLocation || localWebsite) && !editing && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
                {localLocation && <span>{localLocation}</span>}
                {localWebsite && (
                  <a href={localWebsite.startsWith('http') ? localWebsite : `https://${localWebsite}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
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
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{followersCount}</span> followers
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{followingCount}</span> following
                  </span>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-4 min-h-[40px] rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent/70"
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
