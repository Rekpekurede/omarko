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
          className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm sm:items-center sm:justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-sm border border-border bg-card shadow-card dark:border-primary/10 dark:bg-card sm:max-w-2xl sm:rounded-sm">
            <div className="sticky top-0 z-10 border-b border-border bg-card dark:bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Create mark</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="tap-press font-mono p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Close composer"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5 p-4 sm:p-6">
              <div className="border-b border-border pb-5">
                <label className="font-mono block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Claim type</label>
                <button
                  type="button"
                  onClick={() => setIsClaimTypePickerOpen(true)}
                  className="tap-press mt-2 flex min-h-[48px] w-full items-center justify-between rounded-sm border border-border bg-muted/30 px-4 py-3 font-display text-foreground transition hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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

              <div className="border-b border-border pb-5">
                <label htmlFor="composer-domain" className="font-mono block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Domain</label>
                <select
                  id="composer-domain"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value as (typeof DOMAINS)[number]);
                    setDomainTouched(true);
                  }}
                  className="mt-2 min-h-[48px] w-full rounded-sm border border-border bg-muted/30 px-4 py-3 font-display text-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="border-b border-border pb-5">
                <label htmlFor="composer-content" className="font-mono block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Text content (optional)</label>
                <textarea
                  id="composer-content"
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What&apos;s yours?"
                  className="mt-2 w-full rounded-sm border border-border bg-muted/30 px-4 py-3 font-display text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Example: &quot;Silent Hustle&quot; - a phrase you coined
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">Attachment (optional)</label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,audio/*,video/*"
                  onChange={onAttachmentChange}
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
                  {attachmentPreviewUrl && attachmentMeta && (
                    <div className="relative">
                      {attachmentMeta.kind === 'image' && (
                        <div className="h-20 w-20 overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={attachmentPreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                      {attachmentMeta.kind === 'audio' && (
                        <div className="rounded border border-gray-200 px-3 py-2 text-xs text-muted-foreground dark:border-gray-700">
                          <p className="font-medium text-foreground">{attachmentFile?.name}</p>
                          {attachmentMeta.durationMs ? <p>{Math.round(attachmentMeta.durationMs / 1000)}s</p> : <p>Audio</p>}
                        </div>
                      )}
                      {attachmentMeta.kind === 'video' && (
                        <div className="rounded border border-gray-200 px-3 py-2 text-xs text-muted-foreground dark:border-gray-700">
                          <p className="font-medium text-foreground">{attachmentFile?.name}</p>
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
                        className="absolute -right-1 -top-1 rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-white hover:bg-gray-700"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white">Sign of influence (optional)</label>
                <p className="mt-0.5 text-xs text-muted-foreground">Links to posts that take credit from your work. You can add more later from the mark.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={soiUrlInput}
                    onChange={(e) => setSoiUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="min-w-[200px] flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Add
                  </button>
                </div>
                {soiUrls.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {soiUrls.map((u) => (
                      <li key={u} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800">
                        <span className="min-w-0 truncate text-foreground">{u}</span>
                        <button
                          type="button"
                          onClick={() => setSoiUrls((prev) => prev.filter((x) => x !== u))}
                          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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

              <div className="flex justify-end border-t border-border pt-5">
                <button
                  type="submit"
                  disabled={submitting || !selectedClaimType || !domain || (!content.trim() && !attachmentFile)}
                  className="tap-press min-h-[48px] rounded-sm border border-primary bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
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
