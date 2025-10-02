import { getRandomToken } from '@/lib/qobuz-dl-server';
import { getRandomItem } from '@/lib/utils';
import * as z from 'zod';

export type TokenCountry = {
    code: string;
    token: string;
};

// Country codes should follow ISO 3166-1 alpha-2 format (https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
// If you fill this list, process.env.QOBUZ_AUTH_TOKENS will be ignored

const TokenSchema = z.record(z.array(z.string()));
const tokenStoreString = process.env.QOBUZ_AUTH_TOKENS;

if (!tokenStoreString) throw new Error('Deployment is missing QOBUZ_AUTH_TOKENS environment variable.');
export let tokenStore: z.infer<typeof TokenSchema>;

try {
    tokenStore = JSON.parse(tokenStoreString);
} catch {
    throw new Error('Failed to parse QOBUZ_AUTH_TOKENS environment variable.');
}

const result = TokenSchema.safeParse(tokenStore);
if (!result.success) throw new Error(result.error.message);

export const countryCodes = Object.keys(tokenStore);
export const defaultCountry = countryCodes[0];

export function getTokenForCountry(country: string | undefined) {
    if (!country) return getRandomToken();
    return getRandomItem(tokenStore[country]) || getRandomToken();
}
