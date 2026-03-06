'use client';

import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

export function CreateMarkButton() {
  const { openCreateModal } = useCreateMarkModal();

  return (
    <button
      type="button"
      onClick={openCreateModal}
      className="btn-primary tap-press inline-flex h-10 cursor-pointer items-center rounded-[10px] px-5 text-sm font-semibold text-[#0a0a0a]"
    >
      Create
    </button>
  );
}
