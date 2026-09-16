/**
 * Schemastery schema for one assistant profile and the registry config that
 * dicts them by assistant id. The plugin entry owns the section schema.
 *
 * @module @assistant-manager/assistant-manager/config
 */

import z from '@deepseek-ai/schemastery'
import type { AssistantProfile } from './types.js'

/**
 * Schemastery schema for one assistant profile. The `id` is the folder name
 * and serves as the dict key; the schema validates the frontmatter fields
 * that the markdown parser extracts.
 */
export const AssistantProfileSchema: z<AssistantProfile> = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  capabilities: z.array(z.string()),
  customInfo: z.string(),
  mdContent: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
}) as unknown as z<AssistantProfile>
