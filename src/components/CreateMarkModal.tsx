'use client';

/** Audit: removed dev console.log (upload attachment). */
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
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentMeta, setAttachmentMeta] = useState<{ kind: 'image' | 'audio' | 'video'; durationMs?: number; width?: number; height?: number } | null>(null);
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
  const [soiUrls, setSoiUrls] = useState<string[]>([]);
  const [soiUrlInput, setSoiUrlInput] = useState('');
  const [claimTypeOptions, setClaimTypeOptions] = useState<{ id: string; name: string }[]>([]);

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

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/claim-types')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.results?.length) setClaimTypeOptions(data.results);
      })
      .catch(() => {});
  }, [isOpen]);

  const resetForm = () => {
    setContent('');
    setDomain(DOMAINS[0]);
    setSelectedClaimType(null);
    setDomainTouched(false);
    setClaimTypeTouched(false);
    setSaveAsDefault(false);
    setAttachmentFile(null);
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachmentPreviewUrl(null);
    setAttachmentMeta(null);
    setError(null);
    setUploadNotice(null);
    setAiSuggestion(null);
    setAiSuggestionDismissed(false);
    setIsClaimTypePickerOpen(false);
    setSoiUrls([]);
    setSoiUrlInput('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onClose = () => {
    if (submitting) return;
    closeCreateModal();
  };

  const onAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
          ? 'video'
          : null;
    if (!kind) {
      setError('Only image/audio/video attachments are allowed.');
      return;
    }
    setAttachmentFile(file);
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    const objectUrl = URL.createObjectURL(file);
    setAttachmentPreviewUrl(objectUrl);
    setAttachmentMeta({ kind });

    if (kind === 'image') {
      const img = new Image();
      img.onload = () => setAttachmentMeta({ kind, width: img.naturalWidth, height: img.naturalHeight });
      img.src = objectUrl;
    }
    if (kind === 'audio' || kind === 'video') {
      const media = document.createElement(kind);
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        const durationMs = Number.isFinite(media.duration) ? Math.round(media.duration * 1000) : undefined;
        if (kind === 'video') {
          const videoEl = media as HTMLVideoElement;
          setAttachmentMeta({ kind, durationMs, width: videoEl.videoWidth, height: videoEl.videoHeight });
        } else {
          setAttachmentMeta({ kind, durationMs });
        }
      };
      media.src = objectUrl;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const text = content.trim();
    if (!text && !attachmentFile) {
      setAiSuggestion(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setAiLoading(true);
      const res = await fetch('/api/classify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.claimType && data.domain) {
        setAiSuggestion({ claimType: data.claimType, domain: data.domain });
      }
      setAiLoading(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isOpen, content, attachmentFile]);

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
    if (!trimmed && !attachmentFile) {
      setError('Add text or an attachment.');
      return;
    }
    if (!selectedClaimType) {
      setError('Select a claim type');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed || null,
        domain,
        claim_type_id: selectedClaimType?.id,
        claim_type: selectedClaimType?.name,
        category: 'General',
        has_attachment: !!attachmentFile,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to post');
      setSubmitting(false);
      return;
    }
    const markId = data.id as string | undefined;
    if (attachmentFile && markId) {
      const uploadForm = new FormData();
      uploadForm.append('file', attachmentFile);
      uploadForm.append('mark_id', markId);
      if (attachmentMeta?.durationMs) uploadForm.append('duration_ms', String(attachmentMeta.durationMs));
      if (attachmentMeta?.width) uploadForm.append('width', String(attachmentMeta.width));
      if (attachmentMeta?.height) uploadForm.append('height', String(attachmentMeta.height));
      const uploadRes = await fetch('/api/marks/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        const errMsg = uploadData.error ?? 'Attachment upload failed after posting.';
        if (process.env.NODE_ENV === 'development') {
          console.error('[CreateMarkModal] Upload failed', uploadRes.status, uploadData);
        }
        setUploadNotice(errMsg);
      }
    }

    if (markId && soiUrls.length > 0) {
      for (const url of soiUrls) {
        const u = url.trim();
        if (!u) continue;
        await fetch(`/api/marks/${markId}/soi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: u }),
        });
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
          className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-[16px] border border-[var(--border)] bg-[var(--bg-secondary)] p-7 shadow-xl sm:max-w-[520px] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-[1.5rem] font-semibold tracking-tight text-[var(--text-primary)]">
                  Leave Your Mark
                </h2>
                <p className="mt-1 font-body text-[0.85rem] italic text-[var(--text-secondary)]">
                  Declare what you&apos;ve created, discovered, or thought of first.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
              {/* Claim type pills */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  CLAIM TYPE
                </label>
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                  {claimTypeOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedClaimType(opt);
                          setClaimTypeTouched(true);
                        }}
                        className={`shrink-0 cursor-pointer rounded-[20px] border px-3.5 py-1.5 font-body text-[0.75rem] transition-colors ${
                          selectedClaimType?.id === opt.id
                            ? 'border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--bg-primary)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                </div>
                {aiLoading && (
                  <p className="text-xs text-[var(--text-muted)]">Analyzing content...</p>
                )}
                {!aiLoading && aiSuggestion && !aiSuggestionDismissed && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm">
                    <p className="font-medium text-[var(--text-primary)]">AI suggestion</p>
                    <p className="mt-1 text-[var(--text-secondary)]">Claim type: <span className="text-[var(--text-primary)]">{aiSuggestion.claimType}</span></p>
                    <p className="text-[var(--text-secondary)]">Domain: <span className="text-[var(--text-primary)]">{aiSuggestion.domain}</span></p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={applyAiSuggestion}
                        className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)]"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClaimTypeTouched(true);
                          setDomainTouched(true);
                          setAiSuggestionDismissed(true);
                        }}
                        className="rounded-md px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Domain pills */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  DOMAIN
                </label>
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                  {DOMAINS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDomain(d as (typeof DOMAINS)[number]);
                          setDomainTouched(true);
                        }}
                        className={`shrink-0 cursor-pointer rounded-[20px] border px-3.5 py-1.5 font-body text-[0.75rem] transition-colors ${
                          domain === d
                            ? 'border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--bg-primary)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                </div>
              </div>

              {/* What's your Mark? */}
              <div className="flex flex-col gap-2">
                <label htmlFor="composer-content" className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  What&apos;s your Mark?
                </label>
                <textarea
                  id="composer-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe what you're claiming as yours..."
                  className="min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-3.5 font-display text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                  rows={4}
                />
              </div>

              {/* Attachment */}
              <div className="flex flex-col gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,audio/*,video/*"
                  onChange={onAttachmentChange}
                  aria-label="Upload attachment"
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 font-body text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)]"
                  >
                    Add attachment
                  </button>
                  {attachmentPreviewUrl && attachmentMeta && (
                    <div className="relative">
                      {attachmentMeta.kind === 'image' && (
                        <div className="h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={attachmentPreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                      {attachmentMeta.kind === 'audio' && (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <p className="font-medium text-[var(--text-primary)]">{attachmentFile?.name}</p>
                          {attachmentMeta.durationMs ? <p>{Math.round(attachmentMeta.durationMs / 1000)}s</p> : <p>Audio</p>}
                        </div>
                      )}
                      {attachmentMeta.kind === 'video' && (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <p className="font-medium text-[var(--text-primary)]">{attachmentFile?.name}</p>
                          <p>{attachmentMeta.durationMs ? `${Math.round(attachmentMeta.durationMs / 1000)}s` : 'Video'} · Preview</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentFile(null);
                          if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
                          setAttachmentPreviewUrl(null);
                          setAttachmentMeta(null);
                          if (inputRef.current) inputRef.current.value = '';
                        }}
                        className="absolute -right-1 -top-1 rounded-full bg-[var(--text-primary)] px-1.5 py-0.5 text-xs text-[var(--bg-primary)] hover:opacity-90"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sign of influence (optional) - keep for submission */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Sign of influence
                </label>
                <p className="text-xs text-[var(--text-secondary)]">Links to posts that take credit from your work. You can add more later from the mark.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={soiUrlInput}
                    onChange={(e) => setSoiUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const u = soiUrlInput.trim();
                      if (u && !soiUrls.includes(u)) {
                        setSoiUrls((prev) => [...prev, u]);
                        setSoiUrlInput('');
                      }
                    }}
                    disabled={!soiUrlInput.trim()}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {soiUrls.length > 0 && (
                  <ul className="space-y-1">
                    {soiUrls.map((u) => (
                      <li key={u} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm">
                        <span className="min-w-0 truncate text-[var(--text-primary)]">{u}</span>
                        <button
                          type="button"
                          onClick={() => setSoiUrls((prev) => prev.filter((x) => x !== u))}
                          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {uploadNotice && <p className="text-sm text-amber-600">{uploadNotice}</p>}
              <label className="flex items-center gap-2 font-body text-xs text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                />
                Save as my default
              </label>

              <button
                type="submit"
                disabled={submitting || !selectedClaimType || !domain || (!content.trim() && !attachmentFile)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-3.5 font-body font-semibold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-dim)] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" aria-hidden />
                    Posting...
                  </>
                ) : (
                  'Post your Mark'
                )}
              </button>
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
