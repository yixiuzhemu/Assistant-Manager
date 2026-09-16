/**
 * The assistant management surface's controller: owns the panel's snapshot
 * store and every wire call behind its controls. It reads the assistant set
 * through the `assistant` Remote namespace (`listAssistants`), drives the
 * per-assistant actions (`writeAssistant`, `removeAssistant`), and tracks
 * the currently selected assistant for Chat context injection.
 *
 * All RPC calls are serialized on one queue so an action's answer is never
 * clobbered by a concurrent reload.
 *
 * @module @assistant-manager/assistant-manager/client/controller
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.remote merge and the forwarded-event key face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the ctx.remote.assistant namespace.
import type {} from './assistant-remote.ts'
import type { AssistantProfile, AssistantListView } from '../types.ts'
import { dispatchCreateAssistant } from './create-bridge.ts'

/** A structured failure the component maps onto localized copy. */
export interface AssistantManagerError {
  /** `remote` = the Host refused the operation. */
  kind: 'remote'
  /** The underlying diagnostic, rendered beside the localized headline. */
  detail: string
}

/** Everything the section and its editor render. */
export interface AssistantManagerState {
  /** Whether the Host has answered once; the empty line waits for it. */
  loaded: boolean
  /** The document path the panel's path bar renders. */
  documentPath: string
  /** The section revision the last read observed. */
  revision: number
  /** All known assistants ordered by name. */
  assistants: AssistantProfile[]
  /** The currently selected assistant id for Chat context injection. */
  selectedAssistantId: string | undefined
  /** The search filter, applied to assistant names. */
  query: string
  /** Whether a remote call is in flight. */
  busy: boolean
  /** The last structured failure, cleared on the next successful action. */
  error: AssistantManagerError | undefined
  /** Whether the "create assistant" Chat flow is active. */
  creating: boolean
  /** Status message after triggering create. */
  statusMessage: string | undefined
}

/** The registration-side face the section's slot entry injects. */
export interface AssistantManagerFace {
  hooks: {
    /** Panel snapshot bound by the renderer as useAssistantManager. */
    assistantManager: SnapshotStore<AssistantManagerState>
  }
  setSearch: (query: string) => void
  selectAssistant: (id: string | undefined) => void
  remove: (id: string) => void
  refresh: () => void
  startCreate: (prompt: string, statusMsg: string, noWorkspaceMsg: string) => void
  cancelCreate: () => void
  clearStatusMessage: () => void
  getSelectedAssistant: () => AssistantProfile | undefined
}

/** The dormant snapshot before the first Host answer. */
function initialState(): AssistantManagerState {
  return {
    loaded: false,
    documentPath: '',
    revision: 0,
    assistants: [],
    selectedAssistantId: undefined,
    query: '',
    busy: false,
    error: undefined,
    creating: false,
    statusMessage: undefined,
  }
}

/** Render any Remote failure as a human diagnostic. */
function remoteDetail(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return String(error)
}

/**
 * Resolve the `assistant` namespace service via `ctx.get()`, bypassing the
 * cordis context proxy's inject check.
 */
interface AssistantRemoteResult<T> {
  ok: boolean
  value?: T
  error?: unknown
}

interface AssistantNamespaceService {
  listAssistants(): Promise<AssistantRemoteResult<AssistantListView>>
  readAssistant(id: string): Promise<AssistantRemoteResult<AssistantProfile>>
  writeAssistant(profile: AssistantProfile): Promise<AssistantRemoteResult<AssistantProfile>>
  removeAssistant(id: string): Promise<AssistantRemoteResult<AssistantListView>>
  getSystemPrompt(id: string): Promise<AssistantRemoteResult<string>>
  generateId(name: string): Promise<AssistantRemoteResult<string>>
  selectAssistant(id: string | undefined): Promise<AssistantRemoteResult<void>>
}

function getAssistantNamespace(ctx: Context): AssistantNamespaceService {
  return ctx.get('remote.assistant') as AssistantNamespaceService
}

/** Bridges the `assistant` Remote namespace onto the panel's snapshot store. */
export class AssistantManagerController {
  private readonly store = createSnapshotStore<AssistantManagerState>(initialState())
  private readonly disposers: Array<() => void> = []
  private queue: Promise<void> = Promise.resolve()
  private disposed = false
  private readonly assistant: AssistantNamespaceService

  /**
   * @param ctx - the browser plugin context whose `remote.assistant` namespace this drives.
   */
  constructor(private readonly ctx: Context) {
    this.assistant = getAssistantNamespace(ctx)
    // The registry's own change signal.
    this.disposers.push(ctx.remote.$on('assistant/assistants-updated', () => { this.scheduleReload() }))
    this.scheduleReload()
  }

  /**
   * Build the face the section's slot registration injects.
   * @returns the panel snapshot and its bound action callbacks.
   */
  inject(): AssistantManagerFace {
    return {
      hooks: { assistantManager: this.store },
      setSearch: query => this.setSearch(query),
      selectAssistant: id => this.selectAssistant(id),
      remove: id => this.remove(id),
      refresh: () => this.refresh(),
      startCreate: (prompt, statusMsg, noWorkspaceMsg) => this.startCreate(prompt, statusMsg, noWorkspaceMsg),
      cancelCreate: () => this.cancelCreate(),
      clearStatusMessage: () => this.clearStatusMessage(),
      getSelectedAssistant: () => this.getSelectedAssistant(),
    }
  }

  /** Stop following events and refuse further work. */
  dispose(): void {
    this.disposed = true
    for (const dispose of this.disposers) dispose()
    this.disposers.length = 0
  }

  /** Queue a background re-read; serialized behind any in-flight action. */
  private scheduleReload(): void {
    this.queue = this.queue.then(() => this.reload()).catch(() => {})
  }

  /** Queue one busy-flagged action; serialized so answers never interleave. */
  private run(task: () => Promise<void>): void {
    this.queue = this.queue
      .then(async () => {
        if (this.disposed) return
        this.patch({ busy: true })
        try {
          await task()
        } finally {
          if (!this.disposed) this.patch({ busy: false })
        }
      })
      .catch(() => {})
  }

  /** Re-read the assistant list, then fold it into the store. */
  private async reload(): Promise<void> {
    if (this.disposed) return
    const result = await this.assistant.listAssistants()
    if (this.disposed) return
    const view = result.ok ? result.value : undefined
    const error: AssistantManagerError | undefined = result.ok
      ? undefined
      : { kind: 'remote', detail: remoteDetail(result.error) }
    this.publish(view, error)
  }

  /** Merge a list view into the store, preserving UI state. */
  private publish(view: AssistantListView | undefined, error: AssistantManagerError | undefined): void {
    const previous = this.store.getSnapshot()
    // Detect if a new assistant was created (list changed while in creating state)
    const newAssistantCreated = previous.creating
      && view?.assistants.length !== undefined
      && view.assistants.length > previous.assistants.length
    this.store.set({
      ...previous,
      loaded: true,
      documentPath: view?.documentPath ?? '',
      revision: view?.revision ?? 0,
      assistants: view?.assistants ?? [],
      // Reset creating state when assistants are loaded (new assistant detected)
      creating: view?.assistants.length === 0 ? previous.creating : false,
      // Clear status message when a new assistant is created
      statusMessage: newAssistantCreated ? undefined : previous.statusMessage,
      // Never clobber an open editor's own diagnostic on a background refresh.
      error: previous.creating ? previous.error : error,
    })
  }

  /** Shallow-merge a partial patch into the store. */
  private patch(next: Partial<AssistantManagerState>): void {
    if (this.disposed) return
    this.store.set({ ...this.store.getSnapshot(), ...next })
  }

  private setSearch(query: string): void {
    this.patch({ query })
  }

  /** Select an assistant for Chat context injection. */
  private selectAssistant(id: string | undefined): void {
    this.patch({ selectedAssistantId: id })
    // Notify the Host to register/unregister the system prompt section.
    void this.assistant.selectAssistant(id)
  }

  /** Remove one assistant. */
  private remove(id: string): void {
    this.run(async () => {
      const result = await this.assistant.removeAssistant(id)
      if (!result.ok) {
        this.patch({ error: { kind: 'remote', detail: remoteDetail(result.error) } })
        return
      }
      this.patch({ error: undefined })
      // If the removed assistant was selected, clear the selection.
      if (this.store.getSnapshot().selectedAssistantId === id) {
        this.patch({ selectedAssistantId: undefined })
      }
      await this.reload()
    })
  }

  /** Force a re-read. */
  private refresh(): void {
    this.run(async () => { await this.reload() })
  }

  /** Enter the "create assistant" Chat flow: create a new session and dispatch the prompt. */
  private startCreate(prompt: string, statusMsg: string, noWorkspaceMsg: string): void {
    this.patch({ creating: true, error: undefined, statusMessage: undefined })

    // Access sessions and workspaces services via ctx.get() (declared in inject)
    const sessions = this.ctx.get('sessions') as {
      list: { getSnapshot(): { current: string | undefined } }
      create: (opts?: { workspaceId?: string }) => Promise<string>
      open: (id: string) => void
    }
    const workspaces = this.ctx.get('workspaces') as {
      list: { getSnapshot(): { items: readonly { workspaceId: string; sessionIds: readonly string[] }[] } }
    }

    const workspaceSnapshot = workspaces.list.getSnapshot()
    const sessionSnapshot = sessions.list.getSnapshot()
    const currentSessionId = sessionSnapshot.current

    // Find the target workspace: current session's workspace > first workspace
    let targetWorkspaceId: string | undefined
    if (currentSessionId !== undefined) {
      // Find the workspace that contains the current session
      const currentWorkspace = workspaceSnapshot.items.find(
        item => item.sessionIds.includes(currentSessionId),
      )
      targetWorkspaceId = currentWorkspace?.workspaceId
    }
    // Fallback to first workspace if no current session or workspace not found
    if (targetWorkspaceId === undefined && workspaceSnapshot.items.length > 0) {
      targetWorkspaceId = workspaceSnapshot.items[0].workspaceId
    }

    if (targetWorkspaceId === undefined) {
      this.patch({ statusMessage: noWorkspaceMsg, creating: false })
      return
    }

    // Always create a new session for assistant creation
    void sessions.create({ workspaceId: targetWorkspaceId }).then((newSessionId) => {
      // Open the new session
      sessions.open(newSessionId)
      // Dispatch the create request to the Chat input bridge component
      dispatchCreateAssistant({ prompt, autoSubmit: true })
      this.patch({ statusMessage: statusMsg })
      // Reset creating state after a short delay to allow the bridge to process
      setTimeout(() => {
        this.patch({ creating: false })
      }, 500)
    }).catch((error: unknown) => {
      this.patch({
        creating: false,
        error: { kind: 'remote', detail: `Failed to create session: ${String(error)}` },
      })
    })
  }

  /** Clear the status message. */
  private clearStatusMessage(): void {
    this.patch({ statusMessage: undefined })
  }

  /** Cancel the "create assistant" Chat flow. */
  private cancelCreate(): void {
    this.patch({ creating: false, error: undefined })
  }

  /** Get the currently selected assistant's profile. */
  private getSelectedAssistant(): AssistantProfile | undefined {
    const { selectedAssistantId, assistants } = this.store.getSnapshot()
    if (selectedAssistantId === undefined) return undefined
    return assistants.find(a => a.id === selectedAssistantId)
  }
}
