/**
 * Chat-interface assistant selector dropdown: renders beside the mode
 * selector in the Chat UI. When the user picks an assistant, the
 * controller injects that assistant's markdown content as system-prompt
 * context for the current session.
 *
 * @module @assistant-manager/assistant-manager/client/AssistantChatSelector
 */

import { useState, useRef, useEffect } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { AssistantManagerLocaleKey } from './locales.ts'
import type { AssistantManagerFace, AssistantManagerState } from './controller.ts'
import type { AssistantProfile } from '../types.ts'
import css from './AssistantChatSelector.module.css'

/** Props the renderer binds for the chat selector. */
export type AssistantChatSelectorProps =
  PropsLocale<'settings.assistant'>
  & InjectFace<AssistantManagerFace>

/**
 * Render the assistant selector dropdown for the Chat interface.
 * @param props - locale copy and the panel snapshot with its actions.
 * @returns the dropdown component.
 */
export function AssistantChatSelector(props: AssistantChatSelectorProps) {
  const { t } = props
  const state = props.useAssistantManager(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => { document.removeEventListener('mousedown', handleClickOutside) }
  }, [])

  const selectedAssistant = state.assistants.find(a => a.id === state.selectedAssistantId)

  return (
    <div className={css.wrapper} ref={ref}>
      <button
        type="button"
        className={css.trigger}
        aria-label={t('selectAssistant')}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {selectedAssistant !== undefined
          ? (
            <>
              <span className={css.triggerAvatar} aria-hidden="true">
                {selectedAssistant.avatar || '🤖'}
              </span>
              <span className={css.triggerName}>{selectedAssistant.name}</span>
            </>
          )
          : (
            <>
              <span className={css.triggerAvatar} aria-hidden="true">🤖</span>
              <span className={css.triggerPlaceholder}>{t('selectAssistant')}</span>
            </>
          )}
        <span className={css.chevron} data-open={open ? 'true' : undefined} aria-hidden="true" />
      </button>

      {open && (
        <div className={css.dropdown}>
          {/* "No assistant" option */}
          <button
            type="button"
            className={css.option}
            data-selected={state.selectedAssistantId === undefined ? 'true' : undefined}
            onClick={() => { props.selectAssistant(undefined); setOpen(false) }}
          >
            <span className={css.optionAvatar} aria-hidden="true">⊘</span>
            <span className={css.optionName}>{t('noAssistant')}</span>
          </button>

          {state.assistants.length === 0
            ? (
              <div className={css.empty}>
                <span>{t('emptyNoneShort')}</span>
              </div>
            )
            : state.assistants.map(assistant => (
              <button
                key={assistant.id}
                type="button"
                className={css.option}
                data-selected={state.selectedAssistantId === assistant.id ? 'true' : undefined}
                onClick={() => { props.selectAssistant(assistant.id); setOpen(false) }}
              >
                <span className={css.optionAvatar} aria-hidden="true">
                  {assistant.avatar || '🤖'}
                </span>
                <div className={css.optionBody}>
                  <span className={css.optionName}>{assistant.name}</span>
                  <span className={css.optionDesc}>{assistant.description}</span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
