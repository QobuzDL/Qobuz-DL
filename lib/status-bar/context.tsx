'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { StatusBarProps } from '@/components/status-bar/status-bar';

const StatusBarContext = createContext<
    | {
          statusBar: StatusBarProps;
          setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>;
      }
    | undefined
>(undefined);

export const StatusBarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [statusBar, setStatusBar] = useState<StatusBarProps>({
        title: '',
        open: false,
        openPreference: true,
        progress: 0,
        description: '',
        processing: false,
        onCancel: () => {}
    });

    return <StatusBarContext.Provider value={{ statusBar, setStatusBar }}>{children}</StatusBarContext.Provider>;
};

export const useStatusBar = () => {
    const context = useContext(StatusBarContext);

    if (!context) {
        throw new Error('useStatusBar must be used within a StatusBarProvider');
    }

    return context;
};
