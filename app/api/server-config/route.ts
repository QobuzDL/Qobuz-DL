import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const serverConfig = {
      enableServerDownloads: process.env.ENABLE_SERVER_DOWNLOADS === 'true',
      serverSideDownloads: process.env.DEFAULT_SERVER_DOWNLOADS === 'true',
      outputQuality: (process.env.DEFAULT_OUTPUT_QUALITY || '27') as '27' | '7' | '6' | '5',
      outputCodec: (process.env.DEFAULT_OUTPUT_CODEC || 'FLAC') as 'FLAC' | 'WAV' | 'ALAC' | 'MP3' | 'AAC' | 'OPUS',
      bitrate: parseInt(process.env.DEFAULT_BITRATE || '320'),
      serverDownloadPath: process.env.QOBUZ_DOWNLOAD_PATH || 'downloads',
      folderName: process.env.DEFAULT_FOLDER_NAME || '{artists} - {name}',
      trackName: process.env.DEFAULT_TRACK_NAME || '{artists} - {name}',
      zipName: process.env.DEFAULT_ZIP_NAME || '{artists} - {name}'
    }

    return new NextResponse(
      JSON.stringify({ success: true, data: serverConfig }),
      { status: 200 }
    )
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to get server configuration'
      }),
      { status: 500 }
    )
  }
}