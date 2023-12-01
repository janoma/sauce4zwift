import * as storage from './storage.mjs';
import Sentry from '@sentry/node';
import fetch from 'node-fetch';

export class NonMember extends Error {}


async function _api(res, options) {
    const r = await fetch('https://api.saucellc.io' + res, options);
    const body = await r.text();
    const data = body ? JSON.parse(body) : null;
    if (r.status === 404) {
        throw new NonMember();
    } else if (!r.ok) {
        throw new Error(JSON.stringify({status: r.status, data}, null, 4));
    } else {
        return data;
    }
}


export async function link(code, options={}) {
    storage.set('patreon-auth', null);
    let auth;
    try {
        auth = await _api('/patreon/auth', {
            method: 'POST',
            headers: {
                'x-sauce-app': 'zwift',
                'x-sauce-version': options.legacy ? '' : 2,
            },
            body: JSON.stringify({code}),
        });
    } catch(e) {
        if (!(e instanceof NonMember)) {
            Sentry.captureException(e);
            throw e;
        }
        return false;
    }
    storage.set('patreon-auth', auth);
    return true;
}


export function getUserId(options={}) {
    const auth = storage.get('patreon-auth');
    if (auth) {
        return auth.id;
    }
}


export async function getMembership(options={}) {
    const auth = storage.get('patreon-auth');
    if (!auth) {
        throw new TypeError('Patreon link not established');
    }
    const q = options.detailed ? 'detailed=1' : '';
    const r = await fetch(`https://api.saucellc.io/patreon/membership?${q}`, {
        headers: {
            'x-sauce-app': 'zwift',
            'x-sauce-version': options.legacy ? '' : 2,
            Authorization: `${auth.id} ${auth.secret}`
        }
    });
    if (!r.ok) {
        if ([401, 403].includes(r.status)) {
            storage.set('patreon-auth', null);
        } else if (r.status !== 404) {
            throw new Error('Failed to get patreon membership: ' + r.status);
        }
        return null;
    } else {
        return await r.json();
    }
}

export async function getLegacyMembership(token) {
    const r = await fetch('https://www.sauce.llc/patrons.json');
    const patrons = await r.json();
    if (patrons[token]) {
        return {
            patronLevel: patrons[token].level,
        };
    } else {
        return null;
    }
}
