/**
 * The assistant management panel: the section a deployment mounts into
 * `settings.section`. It renders the known assistants as cards — avatar,
 * name, description, tags, and per-card controls (select, delete) — above
 * a search box and a "Create Assistant" entry point.
 *
 * When no assistants exist, an empty state is shown with a prominent
 * "Create Assistant" button that triggers the Chat-based creation flow.
 *
 * @module @assistant-manager/assistant-manager/client/AssistantSection
 */

import { useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AssistantManagerLocaleKey } from './locales.ts'
import type { AssistantManagerFace, AssistantManagerState } from './controller.ts'
import type { AssistantProfile } from '../types.ts'
import css from './AssistantSection.module.css'

/** Props the renderer binds for the assistant section. */
export type AssistantSectionProps =
  PropsRuntime<'settings.assistant'>
  & PropsLocale<'settings.assistant'>
  & InjectFace<AssistantManagerFace>
  & { close: () => void }

/**
 * Render the assistant management panel.
 * @param props - locale copy, the shell's `close`, the panel snapshot, and its actions.
 * @returns the list panel with assistant cards.
 */
export function AssistantSection(props: AssistantSectionProps) {
  const { t } = props
  const state = props.useAssistantManager(snapshot => snapshot)

  const query = state.query.trim().toLowerCase()
  const assistants = query === ''
    ? state.assistants
    : state.assistants.filter(a =>
      a.name.toLowerCase().includes(query)
      || a.description.toLowerCase().includes(query)
      || a.tags.some(tag => tag.toLowerCase().includes(query)),
    )

  return (
    <div className={css.section}>
      <header className={css.header}>
        <div className={css.heading}>
          <h2 className={css.title}>{t('title')}</h2>
          <p className={css.subtitle}>{t('subtitle')}</p>
        </div>
        <button
          type="button"
          className={css.createBtn}
          onClick={() => {
            props.startCreate(
              t('createPrompt'),
              t('createTriggered'),
              t('noWorkspace'),
            )
            // Close settings after a short delay to allow the bridge to process
            setTimeout(() => props.close(), 100)
          }}
          disabled={state.busy || state.creating}
        >
          + {t('createAssistant')}
        </button>
      </header>

      <div className={css.toolbar}>
        <input
          type="search"
          className={css.search}
          value={state.query}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          onChange={event => props.setSearch(event.target.value)}
        />
      </div>

      <div className={css.counts}>
        <span className={css.countTotal}>{`${t('myAssistants')} ${state.assistants.length}`}</span>
        {state.selectedAssistantId !== undefined && (
          <span className={css.countSelected}>{t('selected')}</span>
        )}
      </div>

      {state.statusMessage !== undefined && (
        <div className={css.statusMessage}>
          <p>{state.statusMessage}</p>
          <button
            type="button"
            className={css.dismissBtn}
            onClick={() => props.clearStatusMessage()}
          >
            ✕
          </button>
        </div>
      )}

      {state.error !== undefined
        ? (
          <p className={css.error} role="alert">
            {`${t('actionFailed')} ${state.error.detail}`}
          </p>
        )
        : null}

      {state.documentPath !== '' && (
        <p className={css.path}>
          {t('configPath', { path: state.documentPath })}
        </p>
      )}

      {assistants.length === 0
        ? (
          <div className={css.empty}>
            {state.assistants.length === 0
              ? (
                <div className={css.emptyState}>
                  <span className={css.emptyIcon} aria-hidden="true">🤖</span>
                  <p className={css.emptyText}>{t('emptyNone')}</p>
                  <button
                    type="button"
                    className={css.emptyCreateBtn}
                    onClick={() => {
                      props.startCreate(
                        t('createPrompt'),
                        t('createTriggered'),
                        t('noWorkspace'),
                      )
                      // Close settings after a short delay to allow the bridge to process
                      setTimeout(() => props.close(), 100)
                    }}
                    disabled={state.busy || state.creating}
                  >
                    + {t('createAssistant')}
                  </button>
                </div>
              )
              : <p className={css.emptyText}>{t('emptyNoMatch')}</p>}
          </div>
        )
        : (
          <ul className={css.list}>
            {assistants.map(assistant => (
              <AssistantCard
                key={assistant.id}
                t={t}
                assistant={assistant}
                selected={state.selectedAssistantId === assistant.id}
                busy={state.busy}
                onSelect={props.selectAssistant}
                onRemove={props.remove}
              />
            ))}
          </ul>
        )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Assistant card                                                     */
/* ------------------------------------------------------------------ */

/** Localized copy for one card's controls. */
type CardTranslate = PropsLocale<'settings.assistant'>['t']

/** One assistant card plus the controls the panel binds to it. */
interface AssistantCardProps {
  t: CardTranslate
  assistant: AssistantProfile
  selected: boolean
  busy: boolean
  onSelect: (id: string | undefined) => void
  onRemove: (id: string) => void
}

/**
 * Render one assistant card: avatar, identity, description, tags, and controls.
 * @param props - the card's data and its bound callbacks.
 * @returns the card.
 */
function AssistantCard(props: AssistantCardProps) {
  const { t, assistant, selected, busy } = props
  const [confirmDelete, setConfirmDelete] = useState(false)
  const avatar = assistant.avatar || '🤖'

  return (
    <li className={css.card} data-selected={selected ? 'true' : undefined}>
      <div className={css.cardMain}>
        <span className={css.avatar} aria-hidden="true">{avatar}</span>
        <div className={css.cardBody}>
          <div className={css.cardHeader}>
            <span className={css.name}>{assistant.name}</span>
            {selected && <span className={css.selectedBadge}>{t('active')}</span>}
          </div>
          <p className={css.description}>{assistant.description}</p>
          <div className={css.tags}>
            {assistant.tags.map(tag => (
              <span key={tag} className={css.tag}>{tag}</span>
            ))}
          </div>
          <div className={css.capabilities}>
            {assistant.capabilities.map(cap => (
              <span key={cap} className={css.capability}>{cap}</span>
            ))}
          </div>
        </div>
        <div className={css.controls}>
          <button
            type="button"
            className={css.selectBtn}
            data-active={selected ? 'true' : undefined}
            aria-label={selected ? t('deselect') : t('select')}
            title={selected ? t('deselect') : t('select')}
            disabled={busy}
            onClick={() => props.onSelect(selected ? undefined : assistant.id)}
          >
            {selected ? t('deselect') : t('select')}
          </button>
          {confirmDelete
            ? (
              <>
                <button
                  type="button"
                  className={css.confirmBtn}
                  aria-label={t('deleteConfirm')}
                  title={t('deleteConfirm')}
                  onClick={() => { props.onRemove(assistant.id); setConfirmDelete(false) }}
                >
                  {t('deleteConfirm')}
                </button>
                <button
                  type="button"
                  className={css.cancelBtn}
                  aria-label={t('cancel')}
                  title={t('cancel')}
                  onClick={() => setConfirmDelete(false)}
                >
                  {t('cancel')}
                </button>
              </>
            )
            : (
              <button
                type="button"
                className={css.removeBtn}
                aria-label={t('remove')}
                title={t('remove')}
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 4h12" />
                  <path d="M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4" />
                  <path d="M3.5 4v9a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V4" />
                  <path d="M6.5 7v4.5" />
                  <path d="M9.5 7v4.5" />
                </svg>
              </button>
            )}
        </div>
      </div>
    </li>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Assistant management panel. */
    'settings.assistant': AssistantManagerLocaleKey
  }
}
