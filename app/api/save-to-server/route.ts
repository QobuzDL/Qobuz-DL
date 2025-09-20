import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { join } from 'path'
import z from 'zod'

const saveParamsSchema = z.object({
  filename: z.string(),
  output_path: z.string().default(process.env.QOBUZ_DOWNLOAD_PATH || 'downloads')
})

export async function POST(request: NextRequest) {
  console.log('=== SAVE TO SERVER REQUEST RECEIVED ===')
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const params = Object.fromEntries(formData.entries())
    
    const { filename, output_path } = saveParamsSchema.parse(params)
    console.log('Save to server - REQUEST PARAMS:', { filename, output_path })
    
    if (!file) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400 }
      )
    }
    
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Log for debugging
    console.log('Save to server - output_path:', output_path)
    console.log('Save to server - filename:', filename)
    
    // Create directory and save file
    await fs.mkdir(output_path, { recursive: true })
    const filepath = join(output_path, filename)
    console.log('Save to server - full filepath:', filepath)
    
    await fs.writeFile(filepath, buffer)
    console.log('Save to server - file saved successfully, size:', buffer.length, 'bytes')
    
    const result = { filepath, filename }
    
    return new NextResponse(
      JSON.stringify({ success: true, data: result }),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('=== SAVE TO SERVER ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error?.message || 'Failed to save file to server'
      }),
      { status: 500 }
    )
  }
}