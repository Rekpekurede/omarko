'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS } from '@/lib/types';
import { ClaimTypePicker } from './ClaimTypePicker';

interface CreateMarkFormProps {
  username: string;
}

export function CreateMarkForm({ username }: CreateMarkFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>(DOMAINS[0]);
  const [domainTouched, setDomainTouched] = useState(false);
  const [claimTypeTouched, setClaimTypeTouched] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState<{ id: string; name: string } | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/profile/defaults')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (!domainTouched && data.defaultDomain && (DOMAINS as readonly string[]).includes(data.defaultDomain)) {
          setDomain(data.defaultDomain as (typeof DOMAINS)[number]);
        }
        if (!claimTypeTouched && data.defaultClaimTypeOption) {
          setSelectedClaimType(data.defaultClaimTypeOption);
        }
      })
      .catch(() => {
        // optional
      });
    return () => {
      active = false;
    };
  }, [domainTouched, claimTypeTouched]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setUploadNotice(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = (formData.get('content') as string)?.trim() ?? '';

    if (!content && !imageFile) {
      setError('Add text or an image');
      setIsSubmitting(false);
      return;
    }
    if (!selectedClaimType) {
      setError('Select a claim type');
      setIsSubmitting(false);
      return;
    }

    let imageUrl: string | null = null;
    let imagePath: string | null = null;
    if (imageFile) {
      try {
        const uploadForm = new FormData();
        uploadForm.append('file', imageFile);
        const uploadRes = await fetch('/api/marks/upload-image', {
          method: 'POST',
          body: uploadForm,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          if (!content) {
            setError(uploadData.error ?? 'Image upload failed');
            setIsSubmitting(false);
            return;
          }
          setUploadNotice(uploadData.error ?? 'Image upload failed. Posting text-only.');
        } else {
          imageUrl = uploadData.image_url ?? null;
          imagePath = uploadData.image_path ?? null;
        }
      } catch {
        if (!content) {
          setError('Image upload failed');
          setIsSubmitting(false);
          return;
        }
        setUploadNotice('Image upload failed. Posting text-only.');
      }
    }

    const body = {
      content: content || '',
      image_url: imageUrl,
      image_path: imagePath,
      domain,
      claim_type_id: selectedClaimType.id,
      claim_type: selectedClaimType.name,
    };

    const res = await fetch('/api/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Failed to create mark');
      setIsSubmitting(false);
      return;
    }
    if (saveAsDefault && selectedClaimType) {
      await fetch('/api/profile/defaults', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultDomain: domain,
          defaultClaimType: selectedClaimType.name,
        }),
      });
    }
    router.push(`/mark/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-black dark:text-white">
          Content (optional if image added)
        </label>
        <textarea
          id="content"
          name="content"
          rows={4}
          value={contentDraft}
          onChange={(e) => setContentDraft(e.target.value)}
          placeholder="Your claim..."
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-black dark:text-white">Image (optional)</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          aria-label="Upload image"
          className="mt-1 hidden"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Add image
          </button>
          {imagePreview && (
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
              </div>
              <button
                type="button"
                onClick={clearImage}
                className="absolute -right-1 -top-1 rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-white hover:bg-gray-700"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-black dark:text-white">
          Domain
        </label>
        <select
          id="domain"
          name="domain"
          required
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value as (typeof DOMAINS)[number]);
            setDomainTouched(true);
          }}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-black dark:text-white">Claim type</label>
        <div className="mt-1">
          <ClaimTypePicker
            selected={selectedClaimType}
            onSelect={(next) => {
              setSelectedClaimType(next);
              setClaimTypeTouched(true);
            }}
            contentHint={contentDraft}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={saveAsDefault}
          onChange={(e) => setSaveAsDefault(e.target.checked)}
        />
        Save as my default
      </label>
      <p className="text-sm text-amber-700 dark:text-amber-400">
        {`@${username} is claiming responsibility for this. Make sure the claim type you selected is accurate.`}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {uploadNotice && <p className="text-sm text-amber-600 dark:text-amber-400">{uploadNotice}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !selectedClaimType}
        className="rounded border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {isSubmitting ? 'Submitting…' : selectedClaimType ? 'Submit Claim' : 'Select a claim type'}
      </button>
    </form>
  );
}
