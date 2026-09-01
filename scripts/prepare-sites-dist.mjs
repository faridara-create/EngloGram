import { mkdir, writeFile } from 'node:fs/promises'

const serverDirectory = new URL('../dist/server/', import.meta.url)
await mkdir(serverDirectory, { recursive: true })
await writeFile(new URL('index.js', serverDirectory), `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response

    const acceptsHtml = request.headers.get('accept')?.includes('text/html')
    if (!acceptsHtml) return response

    const indexUrl = new URL('/index.html', request.url)
    return env.ASSETS.fetch(new Request(indexUrl, request))
  },
}\n`)
