/**
 * Wire vocabulary for the assistant registry: the profile shape one assistant
 * folder carries, the list view the Remote `listAssistants` returns, and the
 * Cordis event that announces a change so configuration surfaces refresh
 * without polling.
 *
 * @module @assistant-manager/assistant-manager/types
 */

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * The supervised assistant set changed: an assistant was added, removed,
     * or updated, or the pinned selection changed. This payload-free
     * notification fires at each commit point; consumers re-read the
     * registry's `listAssistants()` for the new state.
     * @mode emit
     */
    'assistant/assistants-updated'(): void
  }
}

/**
 * One assistant's full profile as stored in its `assistant.md` frontmatter
 * plus the rendered markdown body. Safe to cross the Remote wire.
 */
export interface AssistantProfile {
  /** Folder name under `~/.dsh/assistant/`, the assistant's unique identity. */
  id: string
  /** Human-readable display name. */
  name: string
  /** Avatar URL or emoji; absent/empty means use the default avatar. */
  avatar?: string
  /** One-line description of the assistant's purpose. */
  description: string
  /** Domain tags describing what the assistant is good at. */
  tags: string[]
  /** Capability tags describing what the assistant can do. */
  capabilities: string[]
  /** Free-form customization notes the user supplied during creation. */
  customInfo?: string
  /** The complete `assistant.md` content including frontmatter. */
  mdContent: string
  /** Unix-ms creation timestamp. */
  createdAt: number
  /** Unix-ms last-update timestamp. */
  updatedAt: number
}

/**
 * The full assistant list as a management surface reads it: every profile
 * plus the document facts the editor's path bar and revision guard render.
 */
export interface AssistantListView {
  /** All known assistants ordered by name. */
  assistants: AssistantProfile[]
  /** Absolute path of the assistant directory. */
  documentPath: string
  /** Monotonic revision; pass back as the write guard. */
  revision: number
  /** The assistant the Host currently pins into the system prompt, if any. */
  selectedAssistantId: string | undefined
}
