/**
 * File-system store for the assistant directory (`~/.dsh/assistant/`):
 * each assistant lives in its own sub-folder with an `assistant.md` file.
 * The store parses the YAML frontmatter, maintains a monotonic revision,
 * and watches the directory for external changes so a hand-edit reaches
 * the supervisor without a restart.
 *
 * @module @assistant-manager/assistant-manager/assistant-store
 */

import { watchFile, unwatchFile, readdirSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import type { AssistantProfile } from './types.js'

/** dsh profile directory name under the user's home. */
const DSH_DIR = '.dsh'

/** Sub-directory under the dsh profile that holds assistant folders. */
const ASSISTANT_DIR = 'assistant'

/** The markdown file name inside each assistant folder. */
const ASSISTANT_FILE = 'assistant.md'

/** Default avatar emoji when none is specified. */
export const DEFAULT_AVATAR = '🤖'

/**
 * Read/write the assistant directory and announce external changes.
 * One instance per registry; started at mount, stopped at dispose.
 */
export class AssistantStore {
  /** Absolute path of the assistant directory. */
  readonly path: string

  /** Cached assistant profiles keyed by id. */
  private current: Map<string, AssistantProfile> = new Map()
  /** Monotonic revision: bumps on every observed or applied change. */
  private rev = 0
  private readonly change: () => void
  /** Watcher handle for the directory. */
  private watcherHandle: ReturnType<typeof setInterval> | undefined

  /**
   * @param onChange - invoked after each observed change so the owner can
   *   re-reconcile; also fired once after the initial load.
   */
  constructor(onChange: () => void) {
    this.path = resolve(homedir(), DSH_DIR, ASSISTANT_DIR)
    this.change = onChange
  }

  /** All known assistants as an array, ordered by name. */
  get assistants(): AssistantProfile[] {
    return [...this.current.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  /** The revision the current view was read at. */
  get revision(): number {
    return this.rev
  }

  /** Look up one assistant by id. */
  get(id: string): AssistantProfile | undefined {
    return this.current.get(id)
  }

  /** Ensure the directory exists, load assistants, and start watching. */
  async start(): Promise<void> {
    await mkdir(this.path, { recursive: true })
    await this.reload()
    // Poll the directory every 2 seconds for external changes.
    this.watcherHandle = setInterval(() => { void this.reload() }, 2000)
  }

  /** Stop watching the directory. */
  stop(): void {
    if (this.watcherHandle !== undefined) {
      clearInterval(this.watcherHandle)
      this.watcherHandle = undefined
    }
  }

  /**
   * Persist one assistant's markdown content to its folder. Creates the
   * folder if it does not exist. Bumps the revision and announces the change.
   * @param profile - the full assistant profile including the generated md.
   */
  async save(profile: AssistantProfile): Promise<void> {
    const dir = join(this.path, profile.id)
    await mkdir(dir, { recursive: true })
    const file = join(dir, ASSISTANT_FILE)
    await writeFile(file, profile.mdContent, 'utf8')
    this.current.set(profile.id, profile)
    this.rev += 1
    this.change()
  }

  /**
   * Remove one assistant's folder entirely. Bumps the revision and announces.
   * @param id - the assistant folder name to delete.
   */
  async remove(id: string): Promise<void> {
    const dir = join(this.path, id)
    await rm(dir, { recursive: true, force: true })
    this.current.delete(id)
    this.rev += 1
    this.change()
  }

  /** Re-scan the directory from disk, bumping the revision and announcing it. */
  private async reload(): Promise<void> {
    const previous = this.rev
    try {
      const entries = readdirSync(this.path, { withFileTypes: true })
      const seen = new Set<string>()
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const id = entry.name
        seen.add(id)
        const file = join(this.path, id, ASSISTANT_FILE)
        try {
          const content = await readFile(file, 'utf8')
          const profile = parseAssistantMd(id, content)
          const existing = this.current.get(id)
          // Only bump if content actually changed.
          if (existing === undefined || existing.mdContent !== content) {
            this.current.set(id, profile)
            this.rev += 1
          }
        } catch {
          // Missing or unreadable file: skip this assistant.
        }
      }
      // Remove assistants whose folders no longer exist.
      for (const id of [...this.current.keys()]) {
        if (!seen.has(id)) {
          this.current.delete(id)
          this.rev += 1
        }
      }
    } catch {
      // Directory does not exist yet: empty state.
    }
    if (this.rev !== previous) {
      this.change()
    }
  }
}

/**
 * Parse an `assistant.md` file into an {@link AssistantProfile}. The file
 * is expected to carry YAML frontmatter between `---` delimiters, followed
 * by the markdown body.
 *
 * @param id - the folder name serving as the assistant id.
 * @param content - the full file content.
 * @returns the parsed profile.
 */
function parseAssistantMd(id: string, content: string): AssistantProfile {
  const frontmatter = parseFrontmatter(content)
  const now = Date.now()
  return {
    id,
    name: (typeof frontmatter.name === 'string' ? frontmatter.name : null) ?? id,
    avatar: typeof frontmatter.avatar === 'string' ? frontmatter.avatar || undefined : undefined,
    description: typeof frontmatter.description === 'string' ? frontmatter.description : '',
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags as string[] : [],
    capabilities: Array.isArray(frontmatter.capabilities) ? frontmatter.capabilities as string[] : [],
    customInfo: typeof frontmatter.customInfo === 'string' ? frontmatter.customInfo || undefined : undefined,
    mdContent: content,
    createdAt: typeof frontmatter.createdAt === 'number' ? frontmatter.createdAt : now,
    updatedAt: typeof frontmatter.updatedAt === 'number' ? frontmatter.updatedAt : now,
  }
}

/**
 * Minimal YAML frontmatter parser. Extracts key-value pairs between the
 * first pair of `---` delimiters. Supports strings, numbers, and simple
 * string arrays (lines starting with `-`).
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (match === null || match === undefined) return result

  const body = match[1]
  let currentKey = ''
  let currentArray: string[] | undefined

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trimEnd()
    // Array item continuation.
    if (line.trimStart().startsWith('- ') && currentKey !== '') {
      if (currentArray === undefined) currentArray = []
      currentArray.push(line.trimStart().slice(2).trim())
      continue
    }
    // Flush a pending array.
    if (currentArray !== undefined) {
      result[currentKey] = currentArray
      currentArray = undefined
    }
    // Key-value pair.
    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue
    const key = line.slice(0, colonIdx).trim()
    const rawValue = line.slice(colonIdx + 1).trim()
    currentKey = key
    if (rawValue === '') {
      // Could be the start of an array block; wait for the next line.
      continue
    }
    // Strip surrounding quotes.
    const value = rawValue.replace(/^["']|["']$/g, '')
    // Try number.
    const num = Number(value)
    result[key] = Number.isFinite(num) && value !== '' ? num : value
  }
  // Flush a trailing array.
  if (currentArray !== undefined) {
    result[currentKey] = currentArray
  }
  return result
}
