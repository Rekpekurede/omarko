'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';

interface CreateMarkFormProps {
  username: string;
}

export function CreateMarkForm({ username }: CreateMarkFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptsDisputes, setAcceptsDisputes] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!acceptsDisputes) return;
    setError(null);
    setUploadNotice(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = (formData.get('content') as string)?.trim() ?? '';
    const domain = formData.get('domain') as string;
    const claimType = formData.get('claim_type') as string;

    if (!content && !imageFile) {
      setError('Add text or an image');
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
      claim_type: claimType,
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
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="claim_type" className="block text-sm font-medium text-black dark:text-white">
          Claim Type
        </label>
        <select
          id="claim_type"
          name="claim_type"
          required
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          {CLAIM_TYPES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="accepts_disputes"
          type="checkbox"
          checked={acceptsDisputes}
          onChange={(e) => setAcceptsDisputes(e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <label htmlFor="accepts_disputes" className="text-sm text-black dark:text-gray-300">
          {username ? `@${username} is marking this as theirs — and accepts disputes.` : 'You are marking this as yours — and accept disputes.'}
        </label>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-400">
        Lose a dispute → your Mark gets supplanted.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {uploadNotice && <p className="text-sm text-amber-600 dark:text-amber-400">{uploadNotice}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !acceptsDisputes}
        className="rounded border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Claim'}
      </button>
    </form>
  );
}
