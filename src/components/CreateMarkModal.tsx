'use client';

/** Audit: removed dev console.log (upload attachment). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS, CLAIM_TYPES, type ClaimType } from '@/lib/types';
import { useCreateMarkModal } from '@/context/CreateMarkModalContext';
import { ClaimTypePickerSheet } from './ClaimTypePickerSheet';
import { compressImage } from '@/lib/compressImage';

const TOAST_MS = 1800;

/** Three distinct random claim types for the modal suggestion row (reshuffled each time the modal opens). */
function pickThreeRandomClaimTypes(): ClaimType[] {
  const pool = [...CLAIM_TYPES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** Map upload API errors to user-friendly messages. Always suggests posting without image if upload fails. */
function uploadErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('bucket') && lower.includes('not found')) return 'Image upload failed. Please try again. You can still post without an image.';
  if (lower.includes('row-level security') || lower.includes('rls') || lower.includes('policy')) return 'You need to be signed in to upload images. You can still post without an image.';
  if (lower.includes('entity too large') || lower.includes('too large') || lower.includes('exceeds')) return 'This image is too large. Please choose a smaller photo. You can still post without an image.';
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) return 'Upload failed — check your connection and try again. You can still post without an image.';
  return 'Something went wrong with the upload. You can still post without an image.';
}

const REACTION_PATTERNS = [
  'fire',
  'this is fire',
  'love this',
  'nice one',
  'wow',
  'amazing',
  'great',
  'lol',
  'haha',
  'facts',
  'real',
  'based',
  'so true',
  'ikr',
  'this is it',
  'exactly',
  'yes',
  'no',
  'ok',
  'okay',
  'omg',
  'literally',
  'same',
  'mood',
  'period',
  '👏',
  '🔥',
  '💯',
] as const;

const SIMPLE_ACTION_WORDS = [
  'is', 'are', 'was', 'were', 'be', 'being', 'been',
  'have', 'has', 'had', 'do', 'does', 'did',
  'built', 'build', 'created', 'create', 'invented', 'invent',
  'predicted', 'predict', 'argue', 'argued', 'observed', 'observe',
  'named', 'name', 'diagnosed', 'diagnose', 'question', 'questioned',
  'propose', 'proposed', 'rule', 'ruled', 'petition', 'petitioned',
  'discover', 'discovered', 'designed', 'design',
] as const;

type SoftValidationResult = {
  tooShort: boolean;
  genericReaction: boolean;
  noVerb: boolean;
};

function evaluateSoftMarkHeuristic(raw: string): SoftValidationResult {
  const text = raw.trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const normalizedWords = normalized ? normalized.split(' ') : [];

  const tooShort = words.length < 8 || text.length < 50;
  const genericReaction = REACTION_PATTERNS.some((pattern) => {
    const p = pattern.toLowerCase().trim();
    if (!p) return false;
    return normalized === p || normalized.includes(` ${p} `) || normalized.startsWith(`${p} `) || normalized.endsWith(` ${p}`);
  });
  const noVerb = !normalizedWords.some((w) => SIMPLE_ACTION_WORDS.includes(w as (typeof SIMPLE_ACTION_WORDS)[number]));

  return { tooShort, genericReaction, noVerb };
}

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
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [soiUrls, setSoiUrls] = useState<string[]>([]);
  const [soiUrlInput, setSoiUrlInput] = useState('');
  const [claimTypeOptions, setClaimTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [showSoftValidationModal, setShowSoftValidationModal] = useState(false);
  const [bypassSoftValidation, setBypassSoftValidation] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);

  /** Exactly 3 distinct random claim types whenever the modal opens (not tied to API load). */
  const randomClaimSuggestions = useMemo(
    () => (isOpen ? pickThreeRandomClaimTypes() : []),
    [isOpen]
  );

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

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachmentPreviewUrl);
      }
    };
  }, [attachmentPreviewUrl]);

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
    setIsCompressing(false);
    setError(null);
    setUploadNotice(null);
    setAiSuggestion(null);
    setAiSuggestionDismissed(false);
    setIsClaimTypePickerOpen(false);
    setSoiUrls([]);
    setSoiUrlInput('');
    setShowSoftValidationModal(false);
    setBypassSoftValidation(false);
    setExamplesOpen(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onClose = () => {
    if (submitting) return;
    closeCreateModal();
  };

  const onAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    const kind = rawFile.type.startsWith('image/')
      ? 'image'
      : rawFile.type.startsWith('audio/')
        ? 'audio'
        : rawFile.type.startsWith('video/')
          ? 'video'
          : null;
    if (!kind) {
      setError('Only image/audio/video attachments are allowed.');
      return;
    }

    if (kind !== 'image') {
      setAttachmentFile(rawFile);
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      const objectUrl = URL.createObjectURL(rawFile);
      setAttachmentPreviewUrl(objectUrl);
      setAttachmentMeta({ kind });
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
      return;
    }

    try {
      setIsCompressing(true);
      setError(null);
      const { file: compressedFile } = await compressImage(rawFile);
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      const previewUrl = URL.createObjectURL(compressedFile);
      setAttachmentPreviewUrl(previewUrl);
      setAttachmentFile(compressedFile);
      setAttachmentMeta({ kind: 'image' });
      const img = new Image();
      img.onload = () => {
        setAttachmentMeta({ kind: 'image', width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previewUrl;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Compression error:', err);
      }
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      const fallbackUrl = URL.createObjectURL(rawFile);
      setAttachmentPreviewUrl(fallbackUrl);
      setAttachmentFile(rawFile);
      setAttachmentMeta({ kind: 'image' });
      const img = new Image();
      img.onload = () => setAttachmentMeta({ kind: 'image', width: img.naturalWidth, height: img.naturalHeight });
      img.src = fallbackUrl;
    } finally {
      setIsCompressing(false);
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

  const submitMark = async (trimmed: string) => {
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
        const raw = uploadData.error ?? 'Image upload failed. Try again.';
        if (process.env.NODE_ENV === 'development') {
          console.error('[CreateMarkModal] Image upload failed', uploadRes.status, uploadData);
        }
        setError(uploadErrorMessage(raw));
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
        setError('Something went wrong with the upload. You can still post without an image.');
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
        const raw = uploadData.error ?? 'Attachment upload failed.';
        if (process.env.NODE_ENV === 'development') {
          console.error('[CreateMarkModal] Audio/video upload failed', uploadRes.status, uploadData);
        }
        setError(uploadErrorMessage(raw));
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

    // Soft guardrail only: warn before posting likely non-mark reactions.
    if (!bypassSoftValidation) {
      const soft = evaluateSoftMarkHeuristic(trimmed);
      if (soft.tooShort || soft.genericReaction || soft.noVerb) {
        setShowSoftValidationModal(true);
        return;
      }
    }

    await submitMark(trimmed);
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
                <h2 id="create-mark-textarea-label" className="font-display text-[1.5rem] font-semibold tracking-tight text-[var(--text-primary)]">
                  What is your mark?
                </h2>
                <p className="mt-1 font-body text-[0.85rem] italic text-[var(--text-secondary)]">
                  Let it be known what you&apos;re responsible for.
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
              {/* Claim type: 3 random pills + See all */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  CLAIM TYPE (what is yours)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {randomClaimSuggestions.map((name) => {
                    const opt = claimTypeOptions.find((o) => o.name === name) ?? { id: name, name };
                    const isSelected = selectedClaimType?.name === opt.name;
                    return (
                      <button
                        key={name}
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
                        {name}
                      </button>
                    );
                  })}
                  {selectedClaimType && !randomClaimSuggestions.includes(selectedClaimType.name as ClaimType) && (
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
                  DOMAIN (the field it belongs to)
                </label>
                <div className="relative">
                  <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                <textarea
                  id="composer-content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setBypassSoftValidation(false);
                  }}
                  aria-labelledby="create-mark-textarea-label"
                  className="min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-3.5 font-display text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                  rows={4}
                />
                <p className="font-body text-[0.82rem] text-[var(--text-secondary)]">
                  Post a claim, contribution, or creation that came from you.
                </p>
                <p className="font-body text-[0.72rem] text-[var(--text-muted)]">
                  Generic reactions, praise posts, status updates, ads, and spam may be removed as not a mark.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setExamplesOpen((v) => !v)}
                    className="font-body text-[0.78rem] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                  >
                    {examplesOpen ? 'Examples of marks ↑' : 'Examples of marks ↓'}
                  </button>
                  {examplesOpen && (
                    <ul className="mt-2 space-y-1 font-body text-[0.76rem] text-[var(--text-muted)]">
                      <li>&quot;Arsenal will win the league with 83 points.&quot;</li>
                      <li>&quot;This naming framework for creator attribution is mine.&quot;</li>
                      <li>&quot;People trust visible timestamps more than platform memory.&quot;</li>
                      <li>&quot;The best food anyone eats is the food they grew up with.&quot;</li>
                      <li>&quot;I predicted this market correction in January 2024.&quot;</li>
                    </ul>
                  )}
                </div>
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
                    disabled={isCompressing}
                    className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 font-body text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Add attachment
                  </button>
                  {isCompressing && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2">
                      <span className="font-body text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>
                        Optimising image...
                      </span>
                    </div>
                  )}
                  {!isCompressing && attachmentPreviewUrl && attachmentMeta && (
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
                disabled={submitting || isCompressing || !selectedClaimType || !domain || (!content.trim() && !attachmentFile)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-3.5 font-body font-semibold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  opacity: isCompressing ? 0.6 : undefined,
                }}
              >
                {submitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" aria-hidden />
                    Posting...
                  </>
                ) : isCompressing ? (
                  'Optimising...'
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
            {showSoftValidationModal && (
              <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/45 p-4">
                <div className="w-full max-w-[420px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 shadow-xl">
                  <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                    This doesn&apos;t yet read like a clear mark
                  </h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
                    OMarko is for claims, predictions, arguments, observations, creations, and other identifiable contributions. You can still post this, but posts that are not marks may be removed.
                  </p>
                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSoftValidationModal(false);
                        setBypassSoftValidation(false);
                      }}
                      className="min-h-[40px] rounded-lg bg-[var(--accent)] px-4 py-2 font-body text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-dim)]"
                    >
                      Edit post
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setShowSoftValidationModal(false);
                        setBypassSoftValidation(true);
                        await submitMark(content.trim());
                      }}
                      className="min-h-[40px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 font-body text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)]"
                    >
                      Post anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
