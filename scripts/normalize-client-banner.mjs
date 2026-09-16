import { readFile, writeFile } from 'node:fs/promises'

const file = 'client/client.js'
const content = await readFile(file, 'utf8')
// Ensure the banner prefix is intact
if (!content.startsWith('window.__ModuleLoader__.load')) {
  console.warn('client.js does not start with expected banner prefix')
  process.exit(1)
}
console.log('client bundle verified.')
