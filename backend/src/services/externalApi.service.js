
import { config } from '../config/env.js';

export async function railradarFetch(path) {
    const url = `${config.RAILRADAR_API_BASE}${path}`;
    console.log(`[API CALL] ${url}`);

    const headers = { 'Accept': 'application/json' };
    if (config.RAILRADAR_API_KEY) headers['X-API-Key'] = config.RAILRADAR_API_KEY;

    const res = await fetch(url, { headers });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`RailRadar API ${res.status}: ${text}`);
    }

    return res.json();
}
