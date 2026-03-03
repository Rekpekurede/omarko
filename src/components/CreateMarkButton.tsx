'use client';

import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

export function CreateMarkButton() {
  const { openCreateModal } = useCreateMarkModal();

  return (
    <button
      type="button"
      onClick={openCreateModal}
      className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
    >
      Create
    </button>
  );
}
