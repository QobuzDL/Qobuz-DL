'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

const CountryContext = createContext<
    | {
          country: string | undefined;
          setCountry: React.Dispatch<React.SetStateAction<string | undefined>>;
      }
    | undefined
>(undefined);

export const CountryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [country, setCountry] = useState<string | undefined>(undefined);

    useEffect(() => {
        const savedCountry = localStorage.getItem('country');
        if (savedCountry) setCountry(savedCountry);
    }, []);

    useEffect(() => {
        if (country) localStorage.setItem('country', country);
    }, [country]);

    return <CountryContext.Provider value={{ country, setCountry }}>{children}</CountryContext.Provider>;
};

export const useCountry = () => {
    const context = useContext(CountryContext);

    if (!context) {
        throw new Error('useCountry must be used within a CountryProvider');
    }

    return context;
};
