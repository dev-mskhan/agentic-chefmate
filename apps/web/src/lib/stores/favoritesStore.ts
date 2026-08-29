import { create } from 'zustand'
import { isSaved, readSaved, toggleSaved, type SavedItems, type SavedKind } from '../../services/saved'

interface FavoritesStoreState {
  favorites: SavedItems
  isFavorite: (kind: SavedKind, id: string) => boolean
  toggleFavorite: (kind: SavedKind, id: string) => boolean
  refresh: () => void
}

export const useFavoritesStore = create<FavoritesStoreState>((set) => ({
  favorites: readSaved(),
  isFavorite: (kind: SavedKind, id: string) => {
    return isSaved(kind, id)
  },
  toggleFavorite: (kind: SavedKind, id: string) => {
    const result = toggleSaved(kind, id)
    set({ favorites: readSaved() })
    return result
  },
  refresh: () => {
    set({ favorites: readSaved() })
  },
}))
