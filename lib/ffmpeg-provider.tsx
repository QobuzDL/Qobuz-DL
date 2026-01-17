'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createFFmpeg, FFmpegType } from './ffmpeg-functions';

const FFmpegContext = createContext<
    | {
          ffmpegState: FFmpegType;
          setFFmpeg: React.Dispatch<React.SetStateAction<FFmpegType>>;
      }
    | undefined
>(undefined);

export const FFmpegProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ffmpegState, setFFmpeg] = useState(() => (typeof window !== 'undefined' ? createFFmpeg() : null));

    return <FFmpegContext.Provider value={{ ffmpegState, setFFmpeg }}>{children}</FFmpegContext.Provider>;
};

export const useFFmpeg = () => {
    const context = useContext(FFmpegContext);

    if (!context) {
        throw new Error('useFFmpeg must be used within a FFmpegProvider');
    }

    return context;
};
