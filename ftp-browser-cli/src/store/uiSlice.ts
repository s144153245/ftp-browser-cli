/**
 * UI store: mode, selection, pagination, search, downloads.
 */

import { create } from 'zustand';
import type { AppMode, FileItem, DownloadProgress, UISlice } from '../types/index.js';
import { defaults } from '../utils/constants.js';

export interface UIStore extends UISlice {
  setSearchResults: (results: FileItem[]) => void;
  setIsSearching: (v: boolean) => void;
  resetSelection: () => void;
  nextPage: (totalItems: number) => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: (totalItems: number) => void;
  checkedCount: () => number;
  getCheckedIndices: () => number[];
}

export const useUIStore = create<UIStore>((set, get) => ({
  mode: 'browse',
  selectedIndex: 0,
  currentPage: 0,
  itemsPerPage: defaults.itemsPerPage,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  downloads: [],
  checkedItems: new Set<number>(),

  setMode: (mode) => {
    set({ mode });
    if (mode !== 'browse') set({ selectedIndex: 0, currentPage: 0 });
  },

  setSelectedIndex: (index) => set({ selectedIndex: Math.max(0, index) }),

  setCurrentPage: (page) => set({ currentPage: Math.max(0, page), selectedIndex: 0 }),

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (query === '') set({ searchResults: [], isSearching: false });
  },

  setSearchResults: (results) => {
    set({ searchResults: results, selectedIndex: 0, currentPage: 0 });
  },

  setIsSearching: (v) => set({ isSearching: v }),

  addDownload: (d) => {
    const state = get();
    const idx = state.downloads.findIndex((x) => x.id === d.id);
    if (idx >= 0) {
      const next = [...state.downloads];
      next[idx] = d;
      set({ downloads: next });
    } else {
      set({ downloads: [...state.downloads, d] });
    }
  },

  updateDownload: (id, u) => {
    const state = get();
    const idx = state.downloads.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const next = [...state.downloads];
    next[idx] = { ...next[idx], ...u };
    set({ downloads: next });
  },

  removeDownload: (id) => {
    set({ downloads: get().downloads.filter((d) => d.id !== id) });
  },

  toggleCheck: (index: number) => {
    const next = new Set(get().checkedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    set({ checkedItems: next });
  },

  clearChecked: () => set({ checkedItems: new Set<number>() }),

  isItemChecked: (index: number) => get().checkedItems.has(index),

  checkedCount: () => get().checkedItems.size,

  getCheckedIndices: () => Array.from(get().checkedItems).sort((a, b) => a - b),

  resetSelection: () => set({ selectedIndex: 0, currentPage: 0 }),

  nextPage: (totalItems) => {
    const state = get();
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    const next = Math.min(state.currentPage + 1, Math.max(0, totalPages - 1));
    if (next !== state.currentPage) set({ currentPage: next, selectedIndex: 0 });
  },

  prevPage: () => {
    const state = get();
    const prev = Math.max(0, state.currentPage - 1);
    if (prev !== state.currentPage) set({ currentPage: prev, selectedIndex: 0 });
  },

  goToFirstPage: () => set({ currentPage: 0, selectedIndex: 0 }),

  goToLastPage: (totalItems) => {
    const state = get();
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    const last = Math.max(0, totalPages - 1);
    set({ currentPage: last, selectedIndex: 0 });
  },
}));
