import { getRandomToken } from '@/lib/qobuz-dl-server';

export type TokenCountry = {
    code: string;
    token: string;
};

// Country codes should follow ISO 3166-1 alpha-2 format (https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
// If you fill this list, process.env.QOBUZ_AUTH_TOKENS will be ignored

export const tokenCountriesMap: TokenCountry[] = [];
// Example usage
// [
//     {
//         code: 'US',
//         token: 'TOKEN HERE'
//     }
// ]

export const getTokenForCountry = (country: string): string =>
    tokenCountriesMap.find((c) => c.code.toUpperCase() === country.toUpperCase())?.token || getRandomToken();
