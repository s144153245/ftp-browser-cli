import { create } from 'zustand';
import type { UISlice, AppMode, FileItem, DownloadProgress } from '../types/index.js';
import { defaults } from '../utils/constants.js';

/**
 * UI Slice
 * Manages UI state: mode, selection, pagination, search, downloads
 */
export const useUIStore = create<UISlice>((set, get) => ({
  // State
  mode: 'browse',
  selectedIndex: 0,
  currentPage: 0,
  itemsPerPage: defaults.itemsPerPage,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  downloads: [],

  // Actions
  setMode: (mode: AppMode) => {
    set({ mode });
    // Reset selection when mode changes (except when going to browse mode)
    if (mode !== 'browse') {
      set({ selectedIndex: 0, currentPage: 0 });
    }
  },

  setSelectedIndex: (index: number) => {
    const state = get();
    // Validate index is within bounds
    const maxIndex = state.searchResults.length > 0 
      ? state.searchResults.length - 1 
      : 0; // Will be validated against actual files when used
    
    const validIndex = Math.max(0, Math.min(index, maxIndex));
    set({ selectedIndex: validIndex });
  },

  setCurrentPage: (page: number) => {
    const state = get();
    // Calculate total pages based on current file list length
    // This will be properly calculated in selectors
    const totalPages = Math.ceil(
      (state.searchResults.length > 0 ? state.searchResults.length : 0) / state.itemsPerPage
    );
    const validPage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    set({ currentPage: validPage });
    // Reset selection when page changes
    set({ selectedIndex: 0 });
  },

  setItemsPerPage: (itemsPerPage: number) => {
    set({ itemsPerPage, currentPage: 0, selectedIndex: 0 });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    // Clear results when query changes
    if (query === '') {
      set({ searchResults: [], isSearching: false });
    }
  },

  setSearchResults: (results: FileItem[]) => {
    set({ 
      searchResults: results,
      selectedIndex: 0,
      currentPage: 0,
    });
  },

  setIsSearching: (isSearching: boolean) => {
    set({ isSearching });
  },

  addDownload: (download: DownloadProgress) => {
    const state = get();
    // Check if download with same ID already exists
    const existingIndex = state.downloads.findIndex(d => d.id === download.id);
    if (existingIndex >= 0) {
      // Update existing download
      const updatedDownloads = [...state.downloads];
      updatedDownloads[existingIndex] = download;
      set({ downloads: updatedDownloads });
    } else {
      // Add new download
      set({ downloads: [...state.downloads, download] });
    }
  },

  updateDownload: (id: string, updates: Partial<DownloadProgress>) => {
    const state = get();
    const downloadIndex = state.downloads.findIndex(d => d.id === id);
    if (downloadIndex >= 0) {
      const updatedDownloads = [...state.downloads];
      updatedDownloads[downloadIndex] = {
        ...updatedDownloads[downloadIndex],
        ...updates,
      };
      set({ downloads: updatedDownloads });
    }
  },

  removeDownload: (id: string) => {
    const state = get();
    set({ downloads: state.downloads.filter(d => d.id !== id) });
  },

  resetSelection: () => {
    set({ selectedIndex: 0, currentPage: 0 });
  },

  nextPage: () => {
    const state = get();
    const totalItems = state.searchResults.length > 0 
      ? state.searchResults.length 
      : 0; // Will use actual files count from FTP slice
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    const nextPage = Math.min(state.currentPage + 1, Math.max(0, totalPages - 1));
    if (nextPage !== state.currentPage) {
      set({ currentPage: nextPage, selectedIndex: 0 });
    }
  },

  prevPage: () => {
    const state = get();
    const prevPage = Math.max(0, state.currentPage - 1);
    if (prevPage !== state.currentPage) {
      set({ currentPage: prevPage, selectedIndex: 0 });
    }
  },

  goToFirstPage: () => {
    set({ currentPage: 0, selectedIndex: 0 });
  },

  goToLastPage: () => {
    const state = get();
    const totalItems = state.searchResults.length > 0 
      ? state.searchResults.length 
      : 0; // Will use actual files count from FTP slice
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    const lastPage = Math.max(0, totalPages - 1);
    set({ currentPage: lastPage, selectedIndex: 0 });
  },
}));
