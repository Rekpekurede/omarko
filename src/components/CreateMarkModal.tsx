'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLAIM_TYPES, CLAIM_TYPE_HELP, DOMAINS } from '@/lib/types';
import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

const TOAST_MS = 1800;

export function CreateMarkModal() {
  const router = useRouter();
  const { isOpen, closeCreateModal } = useCreateMarkModal();
  const inputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>(DOMAINS[0]);
  const [claimType, setClaimType] = useState<(typeof CLAIM_TYPES)[number]>(CLAIM_TYPES[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const resetForm = () => {
    setContent('');
    setDomain(DOMAINS[0]);
    setClaimType(CLAIM_TYPES[0]);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setError(null);
    setUploadNotice(null);
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
        claim_type: claimType,
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
          <div className="w-full max-h-[80vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:max-w-2xl sm:rounded-xl">
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
                <label htmlFor="composer-claim-type" className="block text-sm font-medium text-black dark:text-white">Claim type</label>
                <select
                  id="composer-claim-type"
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as (typeof CLAIM_TYPES)[number])}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {CLAIM_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60">
                  <p className="text-gray-700 dark:text-gray-200">{CLAIM_TYPE_HELP[claimType].description}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Example: &quot;{CLAIM_TYPE_HELP[claimType].example}&quot;</p>
                </div>
              </div>

              <div>
                <label htmlFor="composer-domain" className="block text-sm font-medium text-black dark:text-white">Domain</label>
                <select
                  id="composer-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as (typeof DOMAINS)[number])}
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
                  placeholder="State your claim..."
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
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You are claiming responsibility for this. Make sure the claim type you selected is accurate.
              </p>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
