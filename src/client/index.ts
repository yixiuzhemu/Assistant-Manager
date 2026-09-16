/**
 * Assistant management surface, browser half — one `settings.section` entry
 * that renders the assistant management panel and provides the Chat-interface
 * assistant selector dropdown. The section is self-contained: this `apply`
 * registers the `settings.assistant` dictionary, mounts the `assistant`
 * Remote contribution by hand, and drives it through one
 * {@link AssistantManagerController}.
 *
 * @module @assistant-manager/assistant-manager/client
 */

// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the conversation slot map merge (the 'conversation.input.dock' entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: the ctx.remote Context merge and the forwarded-event key face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { AssistantSection } from './AssistantSection.tsx'
import { AssistantChatSelector } from './AssistantChatSelector.tsx'
import { CreateAssistantBridge } from './CreateAssistantBridge.tsx'
import { AssistantManagerController } from './controller.ts'
import { ASSISTANT_REMOTE } from './assistant-remote.ts'
import { en, zh } from './locales.ts'

export type { AssistantSectionProps } from './AssistantSection.tsx'
export type { AssistantChatSelectorProps } from './AssistantChatSelector.tsx'
export type { CreateAssistantDockProps } from './CreateAssistantBridge.tsx'
export type {
  AssistantManagerFace, AssistantManagerState, AssistantManagerError,
} from './controller.ts'
export type { CreateAssistantRequest, CreateAssistantListener } from './create-bridge.ts'
export type { AssistantManagerLocaleKey } from './locales.ts'
export { AssistantSection } from './AssistantSection.tsx'
export { AssistantChatSelector } from './AssistantChatSelector.tsx'
export { CreateAssistantBridge } from './CreateAssistantBridge.tsx'
export { AssistantManagerController } from './controller.ts'
export { dispatchCreateAssistant, onCreateAssistant } from './create-bridge.ts'
export { ASSISTANT_REMOTE } from './assistant-remote.ts'
export { en, zh } from './locales.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.assistant'

/** Nav position of the assistant section among the settings pages. */
const SECTION_ORDER = 25

/**
 * The subset of the slots service this plugin touches. Structural on purpose:
 * the host owns the real `ctx.slots`, but no published package declaration-merges
 * it onto the cordis `Context`, so an external plugin types the surface it uses
 * instead of depending on a monorepo-internal augmentation.
 */
interface SlotsService {
  inject(slot: string, register: () => unknown): void
  register(meta: Record<string, unknown>, component: unknown): unknown
}

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'sessions', 'workspaces']

/**
 * Mount the assistant management section and the Chat selector.
 * @param ctx - the browser plugin context.
 * @returns a disposer that unmounts the `assistant` Remote namespace.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'assistant-manager: section dictionary')

  // Mount the `assistant` namespace by hand; a deployment must not also select
  // it in the api-remotes assembly, or this second mount is refused.
  const unmount = await ctx.remote.$mount(ASSISTANT_REMOTE)

  const controller = new AssistantManagerController(ctx)
  ctx.effect(() => () => { controller.dispose() }, 'assistant-manager: panel controller')

  // One navigation entry for the settings panel.
  const slots = (ctx as unknown as { slots: SlotsService }).slots
  slots.inject('settings.section', () => slots.register({
    name: 'settings.section',
    id: 'assistant',
    order: SECTION_ORDER,
    label: () => t('nav'),
    locale: NS,
    inject: () => controller.inject(),
  }, AssistantSection))

  // The Chat-interface assistant selector is injected into the conversation
  // input left area, beside the composer tool row.
  slots.inject('conversation.input.left', () => slots.register({
    name: 'conversation.input.left',
    id: 'assistant-selector',
    order: 0,
    locale: NS,
    inject: () => controller.inject(),
  }, AssistantChatSelector))

  // The create-assistant bridge is injected into the conversation input dock.
  // It listens for create requests and fills the Chat input with the prompt.
  slots.inject('conversation.input.dock', () => slots.register({
    name: 'conversation.input.dock',
    id: 'assistant-create-bridge',
    order: 100,
    locale: NS,
  }, CreateAssistantBridge))

  return async () => { await unmount() }
}
