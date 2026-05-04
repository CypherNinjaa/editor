'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SceneActionsProps {
  sceneId: string
  sceneName: string
  version: number
}

export function SceneActions({ sceneId, sceneName, version }: SceneActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this scene?')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE',
        headers: {
          'If-Match': String(version),
        },
      })
      if (!res.ok) {
        window.alert(`Failed to delete scene (${res.status})`)
      } else {
        router.refresh()
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error deleting scene')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRename() {
    const newName = window.prompt('Enter new scene name:', sceneName)
    if (!newName || newName === sceneName) return
    setIsRenaming(true)
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': String(version),
        },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) {
        window.alert(`Failed to rename scene (${res.status})`)
      } else {
        router.refresh()
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error renaming scene')
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
      <button
        type="button"
        onClick={handleRename}
        disabled={isRenaming || isDeleting}
        className="rounded border border-border bg-accent px-2 py-1 text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
      >
        {isRenaming ? 'Renaming…' : 'Rename'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isRenaming || isDeleting}
        className="rounded border border-destructive/20 bg-background px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
