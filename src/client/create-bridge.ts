/**
 * Event bridge for communication between the assistant manager settings panel
 * and the Chat input area. When the user clicks "Create Assistant" in settings,
 * the bridge dispatches an event that the Chat input dock component listens to,
 * which then fills the input with the creation prompt and submits it.
 *
 * Supports pending requests: when dispatched, the request is queued and
 * delivered to the next listener that mounts (for new session flows).
 *
 * @module @assistant-manager/assistant-manager/client/create-bridge
 */

/** Payload of a create-assistant request. */
export interface CreateAssistantRequest {
  /** The prompt text to fill into the Chat input. */
  prompt: string
  /** Whether to automatically submit after filling. */
  autoSubmit: boolean
}

/** Listener callback for create-assistant requests. */
export type CreateAssistantListener = (request: CreateAssistantRequest) => void

/** Module-level listener registry. */
const listeners = new Set<CreateAssistantListener>()

/** Pending request queue for when no listeners are registered. */
let pendingRequest: CreateAssistantRequest | undefined

/**
 * Dispatch a create-assistant request.
 * Clears existing listeners and queues the request as pending.
 * The request will be delivered to the next listener that registers
 * (typically the new session's bridge component after it mounts).
 * @param request - the prompt and auto-submit flag.
 */
export function dispatchCreateAssistant(request: CreateAssistantRequest): void {
  // Clear all existing listeners - they belong to the old session
  listeners.clear()
  // Queue as pending for the new session's bridge to pick up
  pendingRequest = request
}

/**
 * Register a listener for create-assistant requests.
 * If there's a pending request, it will be delivered immediately.
 * @param listener - the callback to invoke when a request is dispatched.
 * @returns a disposer that removes the listener.
 */
export function onCreateAssistant(listener: CreateAssistantListener): () => void {
  listeners.add(listener)
  // Deliver any pending request to the newly registered listener
  if (pendingRequest !== undefined) {
    const request = pendingRequest
    pendingRequest = undefined
    try {
      listener(request)
    } catch {
      // Swallow listener errors.
    }
  }
  return () => { listeners.delete(listener) }
}
