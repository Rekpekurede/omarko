'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface CreateMarkModalContextValue {
  isOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
}

const CreateMarkModalContext = createContext<CreateMarkModalContextValue | undefined>(undefined);

export function CreateMarkModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCreateModal = useCallback(() => setIsOpen(true), []);
  const closeCreateModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openCreateModal, closeCreateModal }),
    [isOpen, openCreateModal, closeCreateModal]
  );

  return <CreateMarkModalContext.Provider value={value}>{children}</CreateMarkModalContext.Provider>;
}

export function useCreateMarkModal() {
  const ctx = useContext(CreateMarkModalContext);
  if (!ctx) throw new Error('useCreateMarkModal must be used within CreateMarkModalProvider');
  return ctx;
}
