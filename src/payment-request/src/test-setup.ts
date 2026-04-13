import '@testing-library/jest-dom'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envFile = resolve(process.cwd(), '.env.test')

if (existsSync(envFile)) {
  const content = readFileSync(envFile, 'utf8')

  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .forEach((line) => {
      const separatorIndex = line.indexOf('=')

      if (separatorIndex === -1) {
        return
      }

      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()

      if (!(key in process.env)) {
        process.env[key] = value
      }
    })
}
