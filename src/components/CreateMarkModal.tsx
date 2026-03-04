'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS } from '@/lib/types';
import { useCreateMarkModal } from '@/context/CreateMarkModalContext';
import { ClaimTypePickerSheet } from './ClaimTypePickerSheet';

const TOAST_MS = 1800;

export function CreateMarkModal() {
  const router = useRouter();
  const { isOpen, closeCreateModal } = useCreateMarkModal();
  const inputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>(DOMAINS[0]);
  const [selectedClaimType, setSelectedClaimType] = useState<{ id: string; name: string } | null>(null);
  const [imageDescription, setImageDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [domainTouched, setDomainTouched] = useState(false);
  const [claimTypeTouched, setClaimTypeTouched] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isClaimTypePickerOpen, setIsClaimTypePickerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ claimType: string; domain: string } | null>(null);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCreateModal();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, closeCreateModal]);

  useEffect(() => {
    if (!isOpen) return;
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
        // Ignore; defaults are optional.
      });
    return () => {
      active = false;
    };
  }, [isOpen, domainTouched, claimTypeTouched]);

  const resetForm = () => {
    setContent('');
    setImageDescription('');
    setDomain(DOMAINS[0]);
    setSelectedClaimType(null);
    setDomainTouched(false);
    setClaimTypeTouched(false);
    setSaveAsDefault(false);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setError(null);
    setUploadNotice(null);
    setAiSuggestion(null);
    setAiSuggestionDismissed(false);
    setIsClaimTypePickerOpen(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onClose = () => {
    if (submitting) return;
    closeCreateModal();
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!isOpen) return;
    const text = content.trim();
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
  }, [isOpen, content, imageDescription, imageFile]);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setUploadNotice(null);
    const trimmed = content.trim();
    if (!trimmed && !imageFile) {
      setError('Add text or an image.');
      return;
    }
    if (!selectedClaimType) {
      setError('Select a claim type');
      return;
    }

    setSubmitting(true);
    let imageUrl: string | null = null;
    let imagePath: string | null = null;

    if (imageFile) {
      const uploadForm = new FormData();
      uploadForm.append('file', imageFile);
      const uploadRes = await fetch('/api/marks/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        if (!trimmed) {
          setError(uploadData.error ?? 'Image upload failed');
          setSubmitting(false);
          return;
        }
        // Allow text-only fallback when an image was optional.
        setUploadNotice(uploadData.error ?? 'Image upload failed. Posting text-only.');
      } else {
        imageUrl = uploadData.image_url ?? null;
        imagePath = uploadData.image_path ?? null;
      }
    }

    const res = await fetch('/api/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed || null,
        domain,
        claim_type_id: selectedClaimType?.id,
        claim_type: selectedClaimType?.name,
        category: 'General',
        media_url: imageUrl,
        image_path: imagePath,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to post');
      setSubmitting(false);
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

    setSubmitting(false);
    closeCreateModal();
    resetForm();
    setToast('Posted');
    setTimeout(() => setToast(null), TOAST_MS);
    router.refresh();
  };

  return (
    <>
      {toast && (
        <div className="fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded bg-black px-3 py-1.5 text-sm text-white shadow dark:bg-gray-100 dark:text-gray-900">
          {toast}
        </div>
      )}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/50 sm:items-center sm:justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:max-w-2xl sm:rounded-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black dark:text-white">Create mark</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Close composer"
              >
                ×
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">Claim type</label>
                <button
                  type="button"
                  onClick={() => setIsClaimTypePickerOpen(true)}
                  className="mt-1 flex min-h-[42px] w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className={selectedClaimType ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedClaimType?.name ?? 'Select claim type'}
                  </span>
                  <span className="text-xs text-muted-foreground">Change</span>
                </button>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick the label that best matches what you&apos;re claiming.
                </p>
                {aiLoading && (
                  <p className="mt-1 text-xs text-muted-foreground">Analyzing content...</p>
                )}
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
                          setIsClaimTypePickerOpen(true);
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
              </div>

              <div>
                <label htmlFor="composer-domain" className="block text-sm font-medium text-black dark:text-white">Domain</label>
                <select
                  id="composer-domain"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value as (typeof DOMAINS)[number]);
                    setDomainTouched(true);
                  }}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="composer-content" className="block text-sm font-medium text-black dark:text-white">Text content (optional)</label>
                <textarea
                  id="composer-content"
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What&apos;s yours?"
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Example: &quot;Silent Hustle&quot; - a phrase you coined
                </p>
              </div>
              <div>
                <label htmlFor="composer-image-description" className="block text-sm font-medium text-black dark:text-white">Image description (optional)</label>
                <input
                  id="composer-image-description"
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Optional caption or context"
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white">Image (optional)</label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
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
                        onClick={() => {
                          setImageFile(null);
                          if (imagePreview) URL.revokeObjectURL(imagePreview);
                          setImagePreview(null);
                          if (inputRef.current) inputRef.current.value = '';
                        }}
                        className="absolute -right-1 -top-1 rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-white hover:bg-gray-700"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {uploadNotice && <p className="text-sm text-amber-600 dark:text-amber-400">{uploadNotice}</p>}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                />
                Save as my default
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !selectedClaimType || !domain || (!content.trim() && !imageFile)}
                  className="rounded border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
            <ClaimTypePickerSheet
              isOpen={isClaimTypePickerOpen}
              onClose={() => setIsClaimTypePickerOpen(false)}
              onSelect={(next) => {
                setSelectedClaimType(next);
                setClaimTypeTouched(true);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
