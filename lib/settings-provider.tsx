'use client';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type SettingsProps = {
    particles: boolean;
    outputQuality: '27' | '7' | '6' | '5';
    outputCodec: 'FLAC' | 'WAV' | 'ALAC' | 'MP3' | 'AAC' | 'OPUS';
    bitrate: number | undefined;
    applyMetadata: boolean;
    fixMD5: boolean;
    explicitContent: boolean;
    albumArtSize: number;
    albumArtQuality: number;
    zipName: string;
    trackName: string;
};

export const nameVariables: string[] = ['artists', 'name', 'year', 'duration'];

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
        typeof obj.zipName === 'string' && typeof obj.trackName === 'string'
    );
};

const SettingsContext = createContext<
    | {
          settings: SettingsProps;
          setSettings: React.Dispatch<React.SetStateAction<SettingsProps>>;
          resetSettings: () => void;
      }
    | undefined
>(undefined);

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
    trackName: '{artists} - {name}'
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SettingsProps>(defaultSettings);

    useEffect(() => {
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings && isValidSettings(JSON.parse(savedSettings))) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings]);

    return <SettingsContext.Provider value={{ settings, setSettings, resetSettings: () => setSettings(defaultSettings) }}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const context = useContext(SettingsContext);

    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }

    return context;
};
