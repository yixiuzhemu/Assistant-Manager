/**
 * File-backed assistant registry plugin: manages AI assistants stored as
 * individual markdown files under `~/.dsh/assistant/<id>/assistant.md` and
 * exposes the `assistant` Remote namespace so a management surface can
 * list, create, update, and delete assistants, as well as retrieve the
 * system-prompt content for a selected assistant.
 *
 * The plugin wraps an {@link AssistantStore}, which owns the directory
 * watcher and the markdown parser. Each Remote method validates inputs,
 * mutates the store, and returns the updated view.
 *
 * @module @assistant-manager/assistant-manager
 */

import type { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import z from '@deepseek-ai/schemastery'
import type { AssistantProfile, AssistantListView } from './types.js'
import { AssistantStore, DEFAULT_AVATAR } from './assistant-store.js'

/** The system prompt section name for the selected assistant. */
const ASSISTANT_SYSTEM_PROMPT_SECTION = 'assistant-manager:selected-assistant'

export type { AssistantProfile, AssistantListView } from './types.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the `assistant` Remote namespace and the file-backed assistant store. */
    assistantRegistry: AssistantRegistry
  }
}

// Merge this owner's failure codes into the shared Remote vocabulary.
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The assistant directory was removed between a write and this read-back. */
    'assistant/directory-missing': {}
    /** No assistant by that id exists. */
    'assistant/not-found': { readonly assistantId: string }
    /** The store refused the write (invalid profile or stale revision). */
    'assistant/rejected': {}
    /** An assistant with this id already exists. */
    'assistant/already-exists': { readonly assistantId: string }
  }
}

/**
 * Host service backing the generated `ctx.remote.assistant` namespace. It
 * resolves the assistant set from the file-system store, reports each
 * assistant's profile, and carries the management operations a configuration
 * surface drives: create, update, remove, and system-prompt retrieval.
 */
export class AssistantRegistry extends TypertRemoteService {
  /** Tools must be mounted before the store begins watching. */
  static inject = ['tools']

  /**
   * Plugin config schema. The literal stays in this entry file because
   * `gen-config-catalog` walks a plugin's schema from there.
   */
  static Config = z.object({}) as unknown as z<Record<string, never>>

  /** File-system store backing the assistant directory. */
  private readonly store: AssistantStore
  /** The currently selected assistant id for system-prompt injection. */
  private selectedId: string | undefined
  /** The context for system prompt registration. */
  private readonly selfCtx: Context

  /**
   * Register the `assistant` namespace, start the directory watcher, and
   * schedule teardown.
   * @param ctx - Host context providing the tools registry and logger.
   * @param _config - resolved plugin config (currently empty).
   */
  constructor(ctx: Context, _config: Record<string, never>) {
    super(ctx, 'assistantRegistry', { namespace: 'assistant' })
    this.selfCtx = ctx
    this.store = new AssistantStore(() => {
      // Notify listeners that the assistant set changed.
      ctx.emit('assistant/assistants-updated')
      // If the selected assistant changed, update the system prompt.
      if (this.selectedId !== undefined) {
        this.updateSystemPrompt(this.selectedId)
      }
    })
    ctx.logger.info(`assistant-registry: directory at ${this.store.path}`)
    // Teardown stops the directory watcher.
    ctx.effect(() => () => {
      this.store.stop()
    }, 'assistant-registry.store')
    void this.store.start().catch((error: unknown) => {
      ctx.logger.error('assistant-registry: watching the assistant directory failed')
      ctx.logger.error(error)
    })
  }

  /**
   * Snapshot every assistant's profile.
   * @returns the full list view including all profiles and the document path.
   */
  @Remote
  listAssistants(): AssistantListView {
    return {
      assistants: this.store.assistants,
      documentPath: this.store.path,
      revision: this.store.revision,
    }
  }

  /**
   * Read one assistant's full profile by id.
   * @param id - the assistant folder name.
   * @returns the full profile including the markdown content.
   * @throws RemoteError when no assistant by that id exists.
   */
  @Remote
  readAssistant(id: string): AssistantProfile {
    const profile = this.store.get(id)
    if (profile === undefined) {
      throw new RemoteError('assistant/not-found', `no assistant named "${id}"`, { assistantId: id })
    }
    return profile
  }

  /**
   * Create or update one assistant. If the id already exists, the profile
   * is updated in place; otherwise a new folder is created.
   * @param profile - the full assistant profile to persist.
   * @returns the persisted profile (with updated timestamps).
   * @throws RemoteError when the profile is invalid or the write is refused.
   */
  @Remote
  async writeAssistant(profile: AssistantProfile): Promise<AssistantProfile> {
    if (profile.id === undefined || profile.id.trim() === '') {
      throw new RemoteError('assistant/rejected', 'assistant id is required', {})
    }
    if (profile.name === undefined || profile.name.trim() === '') {
      throw new RemoteError('assistant/rejected', 'assistant name is required', {})
    }
    const now = Date.now()
    const existing = this.store.get(profile.id)
    const persisted: AssistantProfile = {
      ...profile,
      avatar: profile.avatar || DEFAULT_AVATAR,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    try {
      await this.store.save(persisted)
    } catch (error: unknown) {
      throw new RemoteError('assistant/rejected', error instanceof Error ? error.message : String(error), {}, { cause: error })
    }
    return persisted
  }

  /**
   * Remove one assistant's folder entirely.
   * @param id - the assistant folder name to delete.
   * @returns the list view after the removal.
   * @throws RemoteError when no assistant by that id exists.
   */
  @Remote
  async removeAssistant(id: string): Promise<AssistantListView> {
    if (this.store.get(id) === undefined) {
      throw new RemoteError('assistant/not-found', `no assistant named "${id}"`, { assistantId: id })
    }
    await this.store.remove(id)
    return this.listAssistants()
  }

  /**
   * Retrieve the system-prompt content for a selected assistant. This is
   * the markdown body the Chat interface injects as前置上下文 when the
   * user selects this assistant from the dropdown.
   * @param id - the assistant folder name.
   * @returns the full markdown content suitable for system-prompt injection.
   * @throws RemoteError when no assistant by that id exists.
   */
  @Remote
  getSystemPrompt(id: string): string {
    const profile = this.store.get(id)
    if (profile === undefined) {
      throw new RemoteError('assistant/not-found', `no assistant named "${id}"`, { assistantId: id })
    }
    return profile.mdContent
  }

  /**
   * Generate a slug-style id from the assistant name, suitable for use as
   * the folder name. Converts to lowercase, replaces non-alphanumeric
   * characters with hyphens, and collapses runs.
   * @param name - the human-readable assistant name.
   * @returns a filesystem-safe id string.
   */
  @Remote
  generateId(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'assistant'
  }

  /**
   * Select an assistant for system-prompt injection into all conversations.
   * Pass undefined to clear the selection.
   * @param id - the assistant folder name, or undefined to clear.
   */
  @Remote
  selectAssistant(id: string | undefined): void {
    this.selectedId = id
    this.updateSystemPrompt(id)
    this.selfCtx.logger.info(`assistant-registry: selected assistant changed to ${id ?? '(none)'}`)
  }

  /**
   * Update the system prompt section with the selected assistant's content.
   * @param id - the assistant id, or undefined to clear.
   */
  private updateSystemPrompt(id: string | undefined): void {
    const systemPrompt = (this.selfCtx as unknown as { systemPrompt?: {
      section: (opts: { name: string; order: number; text: string }) => void
      removeSection: (name: string) => void
    } }).systemPrompt
    if (systemPrompt === undefined) return

    if (id === undefined) {
      systemPrompt.removeSection(ASSISTANT_SYSTEM_PROMPT_SECTION)
      return
    }

    const profile = this.store.get(id)
    if (profile === undefined) {
      systemPrompt.removeSection(ASSISTANT_SYSTEM_PROMPT_SECTION)
      return
    }

    // Register the assistant's markdown content as a system prompt section.
    // Use a high order to place it after standard sections.
    systemPrompt.section({
      name: ASSISTANT_SYSTEM_PROMPT_SECTION,
      order: 1000,
      text: profile.mdContent,
    })
  }
}

export default AssistantRegistry
