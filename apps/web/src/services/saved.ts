export type SavedKind = 'chef' | 'dish' | 'plan'

export interface SavedItems {
  chef: string[]
  dish: string[]
  plan: string[]
}

const savedKey = 'chefmate-saved'

const emptySaved = (): SavedItems => ({ chef: [], dish: [], plan: [] })

export function readSaved(): SavedItems {
  if (typeof window === 'undefined') return emptySaved()
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(savedKey) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return emptySaved()
    const value = parsed as Partial<Record<SavedKind, unknown>>
    return {
      chef: Array.isArray(value.chef) ? value.chef.filter((id): id is string => typeof id === 'string') : [],
      dish: Array.isArray(value.dish) ? value.dish.filter((id): id is string => typeof id === 'string') : [],
      plan: Array.isArray(value.plan) ? value.plan.filter((id): id is string => typeof id === 'string') : [],
    }
  } catch {
    return emptySaved()
  }
}

export function writeSaved(value: SavedItems) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(savedKey, JSON.stringify({
      chef: [...new Set(value.chef)],
      dish: [...new Set(value.dish)],
      plan: [...new Set(value.plan)],
    }))
    window.dispatchEvent(new Event('chefmate-saved-updated'))
  } catch {
    // Storage can be unavailable in private browsing or when disabled.
  }
}

export function getSavedIds(kind: SavedKind): string[] {
  return readSaved()[kind]
}

export function isSaved(kind: SavedKind, id: string) {
  return readSaved()[kind].includes(id)
}

export function toggleSaved(kind: SavedKind, id: string) {
  const saved = readSaved()
  saved[kind] = saved[kind].includes(id)
    ? saved[kind].filter((item) => item !== id)
    : [...saved[kind], id]
  writeSaved(saved)
  return saved[kind].includes(id)
}
