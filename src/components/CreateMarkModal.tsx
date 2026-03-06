'use client';

/** Audit: removed dev console.log (upload attachment). */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS, CLAIM_TYPES, TOP_CLAIM_TYPES, type ClaimType } from '@/lib/types';
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
  const [aiSuggestion, setAiSuggestion] = useState<{ claimType: string; domain: string; confidence: string } | null>(null);
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
        const raw = data?.results ?? [];
        const list = raw.filter((r: { name: string }) => CLAIM_TYPES.includes(r.name as ClaimType));
        list.sort((a: { name: string }, b: { name: string }) => CLAIM_TYPES.indexOf(a.name as ClaimType) - CLAIM_TYPES.indexOf(b.name as ClaimType));
        if (list.length) setClaimTypeOptions(list);
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

  // Only trigger 1.5s after user stops typing, when content is 15+ chars. Never on modal open, file upload, or short content.
  useEffect(() => {
    if (!isOpen) return;
    const text = content.trim();
    if (!text || text.length < 15) {
      setAiSuggestion(null);
      setAiLoading(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setAiLoading(true);
      const res = await fetch('/api/classify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      setAiLoading(false);
      if (res.ok && data.claimType && data.domain && (data.confidence === 'high' || data.confidence === 'medium')) {
        setAiSuggestion({ claimType: data.claimType, domain: data.domain, confidence: data.confidence });
      }
    }, 1500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, content]);

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
    setAiSuggestion(null);
    setAiSuggestionDismissed(true);
  };

  const dismissAiSuggestion = () => {
    setAiSuggestion(null);
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
    const isImageAttachment = attachmentFile && attachmentMeta?.kind === 'image';
    let imageUrl: string | null = null;
    let uploadPayload: { path: string; kind: string; mime_type: string; size_bytes: number; duration_ms?: number; width?: number; height?: number } | null = null;

    // Image: upload first so the mark is created with image_url set (feed will show it).
    if (isImageAttachment && attachmentFile) {
      const uploadForm = new FormData();
      uploadForm.append('file', attachmentFile);
      if (attachmentMeta?.durationMs) uploadForm.append('duration_ms', String(attachmentMeta.durationMs));
      if (attachmentMeta?.width) uploadForm.append('width', String(attachmentMeta.width));
      if (attachmentMeta?.height) uploadForm.append('height', String(attachmentMeta.height));
      const uploadRes = await fetch('/api/marks/upload-image', {
        method: 'POST',
        body: uploadForm,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        const errMsg = uploadData.error ?? 'Image upload failed. Try again.';
        if (process.env.NODE_ENV === 'development') {
          console.error('[CreateMarkModal] Image upload failed', uploadRes.status, uploadData);
        }
        setError(errMsg);
        setSubmitting(false);
        return;
      }
      imageUrl = uploadData.publicUrl ?? null;
      uploadPayload = {
        path: uploadData.path,
        kind: uploadData.kind,
        mime_type: uploadData.mime_type ?? attachmentFile.type,
        size_bytes: uploadData.size_bytes ?? attachmentFile.size,
        duration_ms: uploadData.duration_ms,
        width: uploadData.width,
        height: uploadData.height,
      };
      if (!imageUrl) {
        setError('Image upload did not return a URL.');
        setSubmitting(false);
        return;
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
        has_attachment: !!attachmentFile,
        image_url: imageUrl || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[CreateMarkModal] Mark create failed', res.status, data);
      }
      setError(data.error ?? 'Failed to post');
      setSubmitting(false);
      return;
    }
    const markId = data.id as string | undefined;

    // Attach media metadata for image (upload was already done; link path to this mark).
    if (markId && uploadPayload && uploadPayload.kind === 'image') {
      const attachRes = await fetch(`/api/marks/${markId}/attach-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadPayload),
      });
      if (!attachRes.ok && process.env.NODE_ENV === 'development') {
        const attachData = await attachRes.json().catch(() => ({}));
        console.warn('[CreateMarkModal] attach-media failed (mark and image are ok)', attachRes.status, attachData);
      }
    }

    // Audio/video: mark already created, upload file and link to mark.
    if (attachmentFile && markId && !isImageAttachment) {
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
        const errMsg = uploadData.error ?? 'Attachment upload failed.';
        if (process.env.NODE_ENV === 'development') {
          console.error('[CreateMarkModal] Audio/video upload failed', uploadRes.status, uploadData);
        }
        setError(errMsg);
        setSubmitting(false);
        return;
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
              {/* Claim type: top 6 pills + See all */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  CLAIM TYPE
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {TOP_CLAIM_TYPES.map((name) => {
                    const opt = claimTypeOptions.find((o) => o.name === name);
                    if (!opt) return null;
                    const isSelected = selectedClaimType?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedClaimType(opt);
                          setClaimTypeTouched(true);
                        }}
                        className="shrink-0 cursor-pointer rounded-[20px] border px-3.5 py-1.5 font-body text-[0.75rem] transition-colors"
                        style={
                          isSelected
                            ? { background: '#C9A84C', color: '#08080C', borderColor: '#C9A84C', fontWeight: 600 }
                            : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                        }
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                  {selectedClaimType && !TOP_CLAIM_TYPES.includes(selectedClaimType.name as (typeof TOP_CLAIM_TYPES)[number]) && (
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer rounded-[20px] border px-3.5 py-1.5 font-body text-[0.75rem] transition-colors"
                      style={{ background: '#C9A84C', color: '#08080C', borderColor: '#C9A84C', fontWeight: 600 }}
                    >
                      {selectedClaimType.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsClaimTypePickerOpen(true)}
                    className="shrink-0 font-body text-[0.8rem] text-[var(--accent)] hover:underline"
                  >
                    + See all claim types
                  </button>
                </div>
              </div>

              {/* Domain pills — scrollable with visible indicator */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  DOMAIN
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'var(--accent) transparent',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {DOMAINS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDomain(d as (typeof DOMAINS)[number]);
                          setDomainTouched(true);
                        }}
                        style={{
                          flexShrink: 0,
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: domain === d ? '1px solid #C9A84C' : '1px solid var(--border)',
                          background: domain === d ? '#C9A84C' : 'transparent',
                          color: domain === d ? '#08080C' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: domain === d ? 600 : 400,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: '8px',
                      width: '40px',
                      background: 'linear-gradient(to right, transparent, var(--bg-secondary))',
                      pointerEvents: 'none',
                    }}
                    aria-hidden
                  />
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

              {/* AI suggestion — below textarea, only when loading or high/medium suggestion, not dismissed */}
              {(aiLoading || (aiSuggestion && !aiSuggestionDismissed)) && (
                <div
                  className="font-body flex items-center justify-between rounded-lg"
                  style={{
                    background: 'var(--accent-glow)',
                    border: '1px solid var(--accent-dim)',
                    padding: '10px 14px',
                  }}
                >
                  {aiLoading ? (
                    <span className="text-[0.82rem]" style={{ color: 'var(--accent)' }}>
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden /> Analyzing...
                    </span>
                  ) : aiSuggestion ? (
                    <>
                      <span className="text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
                        ✦ Suggested: <span className="font-semibold" style={{ color: 'var(--accent)' }}>{aiSuggestion.claimType}</span>
                        {' · '}
                        <span className="font-semibold" style={{ color: 'var(--accent)' }}>{aiSuggestion.domain}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={applyAiSuggestion}
                          className="cursor-pointer rounded-md font-body text-[0.78rem] font-semibold"
                          style={{
                            background: 'var(--accent)',
                            color: 'var(--bg-primary)',
                            padding: '4px 12px',
                          }}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={dismissAiSuggestion}
                          className="cursor-pointer font-body text-[0.78rem]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

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
              selectedId={selectedClaimType?.id ?? null}
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
