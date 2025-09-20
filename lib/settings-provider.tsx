'use client'
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'

export type SettingsProps = {
  particles: boolean
  outputQuality: '27' | '7' | '6' | '5'
  outputCodec: 'FLAC' | 'WAV' | 'ALAC' | 'MP3' | 'AAC' | 'OPUS'
  bitrate: number | undefined
  applyMetadata: boolean
  fixMD5: boolean
  explicitContent: boolean
  albumArtSize: number
  albumArtQuality: number
  zipName: string
  trackName: string
  serverSideDownloads: boolean
  serverDownloadPath: string
  folderName: string
}

export const nameVariables: string[] = ['artists', 'name', 'year', 'duration']

const isValidSettings = (obj: any): obj is SettingsProps => {
  return (
    typeof obj.particles === 'boolean' &&
      ['27', '7', '6', '5'].includes(obj.outputQuality) &&
      ['FLAC', 'WAV', 'ALAC', 'MP3', 'AAC', 'OPUS'].includes(obj.outputCodec) &&
      ((typeof obj.bitrate === 'number' && obj.bitrate >= 24 && obj.bitrate <= 320) || obj.bitrate === undefined) &&
      typeof obj.applyMetadata === 'boolean' &&
      typeof obj.explicitContent === 'boolean' &&
      typeof obj.fixMD5 === 'boolean' &&
      typeof obj.albumArtSize === 'number' &&
      obj.albumArtSize >= 100 &&
      obj.albumArtSize <= 3600 &&
      typeof obj.albumArtQuality === 'number' &&
      obj.albumArtQuality >= 0.1 &&
      obj.albumArtQuality <= 1,
    typeof obj.zipName === 'string' && typeof obj.trackName === 'string' &&
    typeof obj.serverSideDownloads === 'boolean' &&
    typeof obj.serverDownloadPath === 'string' &&
    typeof obj.folderName === 'string'
  )
}

const SettingsContext = createContext<
  | {
      settings: SettingsProps
      setSettings: React.Dispatch<React.SetStateAction<SettingsProps>>
      resetSettings: () => void
      enableServerDownloads: boolean
    }
  | undefined
>(undefined)

export const defaultSettings: SettingsProps = {
  particles: true,
  outputQuality: '27',
  outputCodec: 'FLAC',
  bitrate: 320,
  applyMetadata: true,
  fixMD5: false,
  explicitContent: true,
  albumArtSize: 3600,
  albumArtQuality: 1,
  zipName: '{artists} - {name}',
  trackName: '{artists} - {name}',
  serverSideDownloads: true,
  serverDownloadPath: 'downloads',
  folderName: '{artists} - {name}'
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsProps>(defaultSettings)
  const [isInitialized, setIsInitialized] = useState(false)
  const [enableServerDownloads, setEnableServerDownloads] = useState(false)

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // FORCE CLEAR localStorage to prevent any cached settings from interfering
        console.log('SettingsProvider - CLEARING localStorage settings to force refresh')
        localStorage.removeItem('settings')
        
        // Always fetch server config first
        console.log('SettingsProvider - Fetching server config...')
        const serverConfigResponse = await fetch('/api/server-config')
        let serverDefaults = defaultSettings
        
        if (serverConfigResponse.ok) {
          const serverConfig = await serverConfigResponse.json()
          console.log('SettingsProvider - Server config response:', serverConfig)
          if (serverConfig.success) {
            serverDefaults = {
              ...defaultSettings,
              ...serverConfig.data
            }
            console.log('SettingsProvider - Server defaults after merge:', serverDefaults)
            // Set the enableServerDownloads state
            setEnableServerDownloads(serverConfig.data.enableServerDownloads || false)
          }
        } else {
          console.error('SettingsProvider - Server config request failed:', serverConfigResponse.status)
        }

        // Use server defaults directly, no localStorage merge for now
        console.log('SettingsProvider - Using server defaults directly (no localStorage):', serverDefaults)
        setSettings(serverDefaults)
        setIsInitialized(true)
      } catch (error) {
        console.warn('Failed to fetch server config, using defaults:', error)
        setIsInitialized(true)
      }
    }

    initializeSettings()
  }, [])

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings))
  }, [settings])

  const resetSettings = async () => {
    try {
      const serverConfigResponse = await fetch('/api/server-config')
      if (serverConfigResponse.ok) {
        const serverConfig = await serverConfigResponse.json()
        if (serverConfig.success) {
          setSettings({ ...defaultSettings, ...serverConfig.data })
          setEnableServerDownloads(serverConfig.data.enableServerDownloads || false)
          return
        }
      }
    } catch (error) {
      console.warn('Failed to fetch server config for reset, using defaults:', error)
    }
    setSettings(defaultSettings)
    setEnableServerDownloads(false)
  }

  // Don't render children until settings are initialized with server defaults
  if (!isInitialized) {
    return null
  }

  return (
    <SettingsContext.Provider value={{ settings, setSettings, resetSettings, enableServerDownloads }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }

  return context
}
