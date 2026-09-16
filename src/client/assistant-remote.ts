/**
 * The `assistant` Remote namespace's Client contribution — the wire
 * descriptors the management surface mounts so `ctx.remote.assistant`
 * answers with the same shape the Host `@assistant-manager/assistant-manager`
 * service emits.
 *
 * Inside a full deepseek-harness build the typert generator derives this
 * module from the registry's `@Remote` methods and publishes it as
 * `@assistant-manager/assistant-manager/remote`, which the
 * `@deepseek-ai/dsh-api-remotes` assembly mounts. This package ships the
 * equivalent by hand so the management surface is self-contained: its
 * `apply` mounts {@link ASSISTANT_REMOTE} directly, and a deployment must
 * therefore NOT also add the assistant namespace to that assembly (a
 * second mount of one namespace is refused).
 *
 * @module @assistant-manager/assistant-manager/client/assistant-remote
 */

import { z } from 'zod'
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { AssistantProfile, AssistantListView } from '../types.ts'

/** One assistant's profile as it crosses the wire. */
const assistantProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  description: z.string(),
  tags: z.array(z.string()),
  capabilities: z.array(z.string()),
  customInfo: z.string().optional(),
  mdContent: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

/** The full assistant list view. */
const assistantListViewSchema = z.object({
  assistants: z.array(assistantProfileSchema),
  documentPath: z.string(),
  revision: z.number(),
})

/** A single assistant profile for write operations. */
const writeProfileSchema = assistantProfileSchema

/** An assistant id string. */
const assistantIdSchema = z.string()

/** A system-prompt string. */
const systemPromptSchema = z.string()

/** A generated id string. */
const generatedIdSchema = z.string()

declare module '@deepseek-ai/dsh-typert-protocol' {
  /** Generated direct-namespace surface of the `assistant` service. */
  interface TypertRemoteNamespace$617373697374616e74 {
    listAssistants: () => Promise<RemoteResult<AssistantListView>>
    readAssistant: (id: string) => Promise<RemoteResult<AssistantProfile>>
    writeAssistant: (profile: AssistantProfile) => Promise<RemoteResult<AssistantProfile>>
    removeAssistant: (id: string) => Promise<RemoteResult<AssistantListView>>
    getSystemPrompt: (id: string) => Promise<RemoteResult<string>>
    generateId: (name: string) => Promise<RemoteResult<string>>
    selectAssistant: (id: string | undefined) => Promise<RemoteResult<void>>
  }

  /** Flat endpoint map the gateway projects namespaces from. */
  interface TypertRemoteMap {
    'assistant/listAssistants': () => Promise<RemoteResult<AssistantListView>>
    'assistant/readAssistant': (id: string) => Promise<RemoteResult<AssistantProfile>>
    'assistant/writeAssistant': (profile: AssistantProfile) => Promise<RemoteResult<AssistantProfile>>
    'assistant/removeAssistant': (id: string) => Promise<RemoteResult<AssistantListView>>
    'assistant/getSystemPrompt': (id: string) => Promise<RemoteResult<string>>
    'assistant/generateId': (name: string) => Promise<RemoteResult<string>>
    'assistant/selectAssistant': (id: string | undefined) => Promise<RemoteResult<void>>
  }

  /** Makes `ctx.remote.assistant` the typed namespace above. */
  interface TypertRemoteNamespaceMap {
    'assistant': TypertRemoteNamespace$617373697374616e74
  }

  /**
   * Admits `assistant/assistants-updated` as a `ctx.remote.$on` key.
   */
  interface TypertRemoteEventSelection {
    'assistant/assistants-updated': true
  }
}

/**
 * The `assistant` namespace's Client contribution: one direct descriptor
 * per Host `@Remote` method, with strict codecs so the gateway validates
 * every argument and result at the wire boundary.
 */
export const ASSISTANT_REMOTE: TypertRemoteContribution = {
  package: '@assistant-manager/assistant-manager',
  descriptors: [
    {
      id: '@assistant-manager/assistant-manager#assistant/listAssistants',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'listAssistants',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager/types#AssistantListView',
        schema: assistantListViewSchema,
      },
      sourceLocation: { file: 'src/index.ts', line: 100, column: 3 },
    },
    {
      id: '@assistant-manager/assistant-manager#assistant/readAssistant',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'readAssistant',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'id',
          wire: 'id',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@assistant-manager/assistant-manager#assistant/readAssistant:id',
            schema: assistantIdSchema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager/types#AssistantProfile',
        schema: assistantProfileSchema,
      },
      sourceLocation: { file: 'src/index.ts', line: 115, column: 3 },
    },
    {
      id: '@assistant-manager/assistant-manager#assistant/writeAssistant',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'writeAssistant',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'profile',
          wire: 'profile',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@assistant-manager/assistant-manager#assistant/writeAssistant:profile',
            schema: writeProfileSchema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager/types#AssistantProfile',
        schema: assistantProfileSchema,
      },
      sourceLocation: { file: 'src/index.ts', line: 135, column: 3 },
    },
    {
      id: '@assistant-manager/assistant-manager#assistant/removeAssistant',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'removeAssistant',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'id',
          wire: 'id',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@assistant-manager/assistant-manager#assistant/removeAssistant:id',
            schema: assistantIdSchema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager/types#AssistantListView',
        schema: assistantListViewSchema,
      },
      sourceLocation: { file: 'src/index.ts', line: 160, column: 3 },
    },
    {
      id: '@assistant-manager/assistant-manager#assistant/getSystemPrompt',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'getSystemPrompt',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'id',
          wire: 'id',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@assistant-manager/assistant-manager#assistant/getSystemPrompt:id',
            schema: assistantIdSchema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager#assistant/getSystemPrompt:result',
        schema: systemPromptSchema,
      },
      sourceLocation: { file: 'src/index.ts', line: 178, column: 3 },
    },
    {
      id: '@assistant-manager/assistant-manager#assistant/generateId',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'generateId',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'name',
          wire: 'name',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@assistant-manager/assistant-manager#assistant/generateId:name',
            schema: z.string(),
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager#assistant/generateId:result',
        schema: generatedIdSchema,
      },
      sourceLocation: { file: 'src/index.ts', line: 192, column: 3 },
    },
    {
      id: '@assistant-manager/assistant-manager#assistant/selectAssistant',
      service: 'assistantRegistry',
      namespace: 'assistant',
      method: 'selectAssistant',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'id',
          wire: 'id',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: '@assistant-manager/assistant-manager#assistant/selectAssistant:id',
            schema: z.union([z.string(), z.undefined()]),
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@assistant-manager/assistant-manager#assistant/selectAssistant:result',
        schema: z.void(),
      },
      sourceLocation: { file: 'src/index.ts', line: 210, column: 3 },
    },
  ],
}

export default ASSISTANT_REMOTE
