import { promises as fs } from 'fs'

export async function GET() {
  try {
    const file = await fs.readFile(process.cwd() + '/changelog.json', 'utf8')
    const data = JSON.parse(file)

    return Response.json(data)
  } catch (err) {
    console.error(err)
    return new Response(`Failed to load data: ${(err as Error).message}`, { status: 500 })
  }
}
