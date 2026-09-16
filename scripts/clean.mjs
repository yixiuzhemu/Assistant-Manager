import { rm } from 'node:fs/promises'

for (const dir of ['lib', 'client/client.js']) {
  try {
    await rm(dir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}
console.log('cleaned.')
