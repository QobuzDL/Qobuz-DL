import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem } from './ui/select';
import { SelectTrigger } from '@radix-ui/react-select';
import { ReactCountryFlag } from 'react-country-flag';
import { useCountry } from '@/lib/country-provider';
import axios from 'axios';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const CountryPicker = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
    const { country, setCountry } = useCountry();
    const [countriesList, setCountriesList] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

    useEffect(() => {
        (async () => {
            const response = await axios.get('/api/get-countries');
            if (!response.data.success) return;
            if (response.data.data.length === 0) return;
            setEnabled(true);
            setCountriesList(response.data.data);
            const savedCountry = localStorage.getItem('country');
            if (!savedCountry || !response.data.data.includes(savedCountry)) setCountry(response.data.data[0]);
        })();
    }, []);
    return (
        <>
            {enabled && (
                <div className={cn('flex', className)} ref={ref} {...props}>
                    <Select value={country} onValueChange={setCountry} open={open} onOpenChange={setOpen}>
                        <SelectTrigger className='select-none outline-none'>
                            <div className='bg-background rounded-full'>
                                <div className='bg-primary/10 flex gap-2 px-3 py-1 rounded-full outline-primary/40 outline-[0.5px] outline items-center justify-center text-nowrap'>
                                    {country ? (
                                        <>
                                            <ReactCountryFlag countryCode={country} />
                                        </>
                                    ) : (
                                        <p>Select a country</p>
                                    )}
                                    <ChevronDownIcon />
                                </div>
                            </div>
                        </SelectTrigger>
                        <SelectContent className='mt-2'>
                            {countriesList.map((country) => (
                                <SelectItem key={country} value={country}>
                                    <div className='flex gap-2 items-center'>
                                        <ReactCountryFlag countryCode={country} />
                                        {displayNames.of(country)}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </>
    );
});

CountryPicker.displayName = 'CountryPicker';

export default CountryPicker;
