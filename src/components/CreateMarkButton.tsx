'use client';

import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

export function CreateMarkButton() {
  const { openCreateModal } = useCreateMarkModal();

  return (
    <button
      type="button"
      onClick={openCreateModal}
      className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-accent px-3 text-sm font-semibold text-bg-primary transition-colors hover:opacity-90"
    >
      Create
    </button>
  );
}
