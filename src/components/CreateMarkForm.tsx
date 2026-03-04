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
  const [claimPickerOpenToken, setClaimPickerOpenToken] = useState(0);
  const [selectedClaimType, setSelectedClaimType] = useState<{ id: string; name: string } | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ claimType: string; domain: string } | null>(null);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
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

  useEffect(() => {
    const text = contentDraft.trim();
    const imageCaption = imageFile?.name ?? '';
    const description = imageDescription.trim();
    if (!text && !imageCaption && !description) {
      setAiSuggestion(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setAiLoading(true);
      const res = await fetch('/api/classify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          imageCaption,
          imageDescription: description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.claimType && data.domain) {
        setAiSuggestion({ claimType: data.claimType, domain: data.domain });
      }
      setAiLoading(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [contentDraft, imageDescription, imageFile]);

  const applyAiSuggestion = async () => {
    if (!aiSuggestion) return;
    if ((DOMAINS as readonly string[]).includes(aiSuggestion.domain)) {
      setDomain(aiSuggestion.domain as (typeof DOMAINS)[number]);
      setDomainTouched(true);
    }
    const res = await fetch('/api/claim-types');
    const data = await res.json().catch(() => ({}));
    const match = (data.results ?? []).find(
      (item: { id: string; name: string }) => item.name.toLowerCase() === aiSuggestion.claimType.toLowerCase()
    );
    if (match) {
      setSelectedClaimType(match);
      setClaimTypeTouched(true);
    }
    setAiSuggestionDismissed(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
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
      setError('Add text or an attachment');
      setIsSubmitting(false);
      return;
    }
    if (!selectedClaimType) {
      setError('Select a claim type');
      setIsSubmitting(false);
      return;
    }

    const body = {
      content: content || '',
      domain,
      claim_type_id: selectedClaimType.id,
      claim_type: selectedClaimType.name,
      has_attachment: !!imageFile,
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
    if (imageFile && data.id) {
      const uploadForm = new FormData();
      uploadForm.append('file', imageFile);
      uploadForm.append('mark_id', data.id);
      const uploadRes = await fetch('/api/marks/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => ({}));
        setUploadNotice(uploadData.error ?? 'Attachment upload failed after posting.');
      }
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
        <label className="block text-sm font-medium text-black dark:text-white">Attachment (optional)</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,audio/*,video/*"
          onChange={handleImageChange}
          aria-label="Upload attachment"
          className="mt-1 hidden"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Add attachment
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
          {imageFile && !imagePreview && (
            <div className="rounded border border-gray-200 px-3 py-2 text-xs text-muted-foreground dark:border-gray-700">
              <p className="font-medium text-foreground">{imageFile.name}</p>
              <p>{imageFile.type.startsWith('audio/') ? 'Audio' : imageFile.type.startsWith('video/') ? 'Video' : 'Attachment'}</p>
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
        {aiLoading && <p className="mt-1 text-xs text-muted-foreground">Analyzing content...</p>}
        {!aiLoading && aiSuggestion && !aiSuggestionDismissed && (
          <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p className="font-medium text-foreground">AI suggestion</p>
            <p className="mt-1 text-muted-foreground">Claim type: <span className="text-foreground">{aiSuggestion.claimType}</span></p>
            <p className="text-muted-foreground">Domain: <span className="text-foreground">{aiSuggestion.domain}</span></p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={applyAiSuggestion}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  setClaimPickerOpenToken((x) => x + 1);
                  setClaimTypeTouched(true);
                  setDomainTouched(true);
                  setAiSuggestionDismissed(true);
                }}
                className="rounded-md border border-transparent px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>
          </div>
        )}
        <div className="mt-1">
          <ClaimTypePicker
            selected={selectedClaimType}
            onSelect={(next) => {
              setSelectedClaimType(next);
              setClaimTypeTouched(true);
            }}
            contentHint={contentDraft}
            forceOpenToken={claimPickerOpenToken}
          />
        </div>
      </div>
      <div>
        <label htmlFor="image_description" className="block text-sm font-medium text-black dark:text-white">
          Image description (optional)
        </label>
        <input
          id="image_description"
          value={imageDescription}
          onChange={(e) => setImageDescription(e.target.value)}
          placeholder="Optional caption or context"
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
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
