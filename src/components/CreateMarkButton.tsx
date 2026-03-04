'use client';

import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

export function CreateMarkButton() {
  const { openCreateModal } = useCreateMarkModal();

  return (
    <button
      type="button"
      onClick={openCreateModal}
      className="inline-flex h-9 items-center rounded-xl bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90"
    >
      Create
    </button>
  );
}
