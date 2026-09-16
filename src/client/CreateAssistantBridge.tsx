/**
 * Bridge component injected into the `conversation.input.dock` slot.
 * It listens for create-assistant requests from the settings panel and
 * uses the Chat's `inputActions` to fill the input with the creation
 * prompt and optionally submit it.
 *
 * This component renders nothing visually — it only provides the bridge
 * between the assistant manager and the Chat input system.
 *
 * @module @assistant-manager/assistant-manager/client/CreateAssistantBridge
 */

import { useEffect, useRef } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { onCreateAssistant, type CreateAssistantRequest } from './create-bridge.ts'

/** Props from the conversation.input.dock slot (session scope). */
export type CreateAssistantDockProps = PropsRuntime<'conversation.input.dock'>

/**
 * Bridge component that fills the Chat input with the creation prompt.
 * Renders nothing — only provides the event bridge functionality.
 * @param props - the slot props including inputActions.
 * @returns null (no visual output).
 */
export function CreateAssistantBridge({ inputActions }: CreateAssistantDockProps): null {
  const inputActionsRef = useRef(inputActions)
  inputActionsRef.current = inputActions

  useEffect(() => {
    const dispose = onCreateAssistant((request: CreateAssistantRequest) => {
      const actions = inputActionsRef.current
      if (actions === undefined) return

      // Fill the input with the creation prompt.
      actions.setDraft(request.prompt)

      // Optionally submit after a short delay to ensure the draft is set.
      if (request.autoSubmit) {
        setTimeout(() => {
          actions.submit()
        }, 100)
      }
    })
    return dispose
  }, [])

  return null
}
