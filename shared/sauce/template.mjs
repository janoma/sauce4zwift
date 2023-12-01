/*
 * Derived from _.template.
 * Adds:
 *  Async support
 *  Localization support via {{{localized_key}}}
 */

import * as localeMod from './locale.mjs';
import * as browser from './browser.mjs';


const _tplCache = new Map();
const _tplFetching = new Map();


export async function getTemplate(url, options) {
    const cacheKey = JSON.stringify([url, options]);
    if (!_tplCache.has(cacheKey)) {
        if (!_tplFetching.has(cacheKey)) {
            _tplFetching.set(cacheKey, browser.cachedFetch(url).then(tplText => {
                if (!tplText) {
                    console.error("Template not found:", url);
                    _tplCache.set(cacheKey, undefined);
                    return;
                }
                _tplCache.set(cacheKey, compile(tplText, options));
            }).finally(() => _tplFetching.delete(cacheKey)));
        }
        await _tplFetching.get(cacheKey);
    }
    return _tplCache.get(cacheKey);
}


const htmlEntityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
};
const special = `(?:${Object.keys(htmlEntityMap).join('|')})`;
const testRegexp = RegExp(special);
const replaceRegexp = RegExp(special, 'g');
export function htmlEscape(val) {
    const str = val == null ? '' : '' + val;
    return testRegexp.test(str) ? str.replace(replaceRegexp, x => htmlEntityMap[x]) : str;
}


// Certain characters need to be escaped so that they can be put into a string literal.
const escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
};
const escapeChar = match => '\\' + escapes[match];
const escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

const localeHelpers = {};
for (const fn of Object.values(localeMod.human)) {
    if (!fn.name || !fn.name.startsWith('human')) {
        console.warn("Unexpected naming convention for locale human function:", fn.name);
        continue;
    }
    localeHelpers[fn.name] = fn;
}

const helpers = {
    embed: async function(tpl, data) {
        if (typeof tpl === 'string') {
            const localeKey = this.options.localeKey;
            tpl = await getTemplate(tpl, {localeKey, html: true});
        }
        const resp = await tpl(data);
        if (typeof resp === 'string') {
            return resp;
        } else {
            // This is mildly suboptimal, not sure it warrants a warning though.
            const el = document.createElement('div');
            el.append(resp);
            return el.innerHTML;
        }
    },
    ...localeHelpers,
};

const staticHelpers = {
    inlineURL: url => browser.cachedFetch(url),
};


function makeRender(text, options, helperVars, attrVars) {
    const localePrefix = options.localeKey ? options.localeKey + '_' : '';
    const regexps = {
        localeLookup: /\{\{\{\[(.+?)\]\}\}\}/g,         // {{{[ <locale expression> ]}}}
        locale: /\{\{\{(.+?)\}\}\}/g,                   // {{{ <localekey> }}}
        staticHelper: /\{\{=([^\s]+?)\s+(.+?)=\}\}/g,   // {{= <func> <arg> =}} (prerendered)
        escape: /\{\{(.+?)\}\}/g,                       // {{ <text expression> }}
        interpolate: /\{-(.+?)-\}/g,                    // {- <html expression> -}
        evaluate: /<%([\s\S]+?)%>/g,                    // <% <code> %> (unrendered)
    };
    const noMatch = /(.)^/;
    // Combine delimiters into one regular expression via alternation.
    const matcher = RegExp([
        (regexps.localeLookup || noMatch).source,
        (regexps.locale || noMatch).source,
        (regexps.staticHelper || noMatch).source,
        (regexps.escape || noMatch).source,
        (regexps.interpolate || noMatch).source,
        (regexps.evaluate || noMatch).source,
    ].join('|') + '|$', 'g');
    const code = [`
        return async function sauceTemplateRender(__tplContext, obj) {
            let __t; // tmp
            const __p = []; // output buffer
    `];
    const allVars = new Set(helperVars);
    for (const k of attrVars) {
        allVars.add(k);
    }
    if (allVars.has('obj')) {
        console.error("`obj` is a reserved variable for the template system");
        allVars.delete('obj'); // At least let it limp by without a syntax error
    }
    for (const x of allVars) {
        code.push(`let ${x};`);
    }
    code.push(`({${helperVars.join(', ')}} = __tplContext.helpers);`);
    if (attrVars.length) {
        code.push(`({${attrVars.join(', ')}} = obj);`);
    }
    let index = 0;
    const localeKeys = [];
    const staticCalls = [];
    text.replace(matcher, (...args) => {
        const [match, localeLookup, locale, shName, shArg, escape, interpolate, evaluate, offset] = args;
        code.push(`__p.push('${text.slice(index, offset).replace(escapeRegExp, escapeChar)}');`);
        index = offset + match.length;
        if (localeLookup) {
            code.push(`
                __t = (${localeLookup}).startsWith('/') ?
                    (${localeLookup}).substr(1) :
                    '${localePrefix}' + (${localeLookup});
                __t = __tplContext.localeMod.fastGetMessage(__t);
                if (__t instanceof Promise) __t = await __t;
                __p.push(__t);
            `);
        } else if (locale) {
            const key = locale.startsWith('/') ? locale.substr(1) : localePrefix + locale;
            localeKeys.push(key);
            code.push(`__p.push(__tplContext.localeMessages['${key}']);`);
        } else if (escape) {
            code.push(`
                __t = (${escape});
                if (__t instanceof Promise) __t = await __t;
                if (__t != null) {
                    __p.push(__tplContext.htmlEscape(__t));
                }
            `);
        } else if (interpolate) {
            code.push(`
                __t = (${interpolate});
                if (__t instanceof Promise) __t = await __t;
                if (__t != null) {
                    __p.push(__t);
                }
            `);
        } else if (evaluate) {
            code.push(evaluate);
        } else if (shName) {
            const id = staticCalls.length;
            staticCalls.push([shName, shArg]);
            code.push(`__p.push(__tplContext.statics[${id}]);`);
        }
    });
    code.push(`
        const html = __p.join('');
    `);
    if (options.html) {
        code.push(`return html;`);
    } else {
        code.push(`
            const el = document.createElement('div');
            el.innerHTML = html;
            const frag = document.createDocumentFragment();
            frag.append(...el.childNodes);
            return frag;
        `);
    }
    code.push(`}; /*end-func*/`);
    const source = code.join('\n');
    let render;
    const Fn = (function(){}).constructor;
    try {
        render = (new Fn(source))();
    } catch (e) {
        e.source = source;
        throw e;
    }
    return [render, localeKeys, staticCalls];
}


function compile(text, options={}) {
    const boundHelpers = Object.fromEntries(Object.entries(helpers)
        .map(([k, fn]) => [k, fn.bind({options})]));
    let renderFuncVars;
    let recompiles = 0;
    let render;
    let statics;
    let localeMessages;
    const wrap = async obj => {
        // To avoid using the deprecated `with` statement we need to memoize the obj vars.
        const vars = obj && !Array.isArray(obj) ? Object.keys(obj) : [];
        if (!render || vars.join() !== renderFuncVars.join()) {
            renderFuncVars = vars;
            if (recompiles++ > 10) {
                console.warn("Highly variadic template function detected");
            }
            let localeKeys, staticCalls;
            [render, localeKeys, staticCalls] = makeRender(text, options, Object.keys(helpers), vars);
            localeMessages = localeKeys.length ?
                await localeMod.fastGetMessagesObject(localeKeys) : undefined;
            statics = staticCalls.length ?
                await Promise.all(staticCalls.map(([name, args]) => staticHelpers[name](args))) : undefined;
        }
        return render.call(this, {
            localeMod,
            htmlEscape,
            helpers: boundHelpers,
            localeMessages,
            statics
        }, obj);
    };
    return wrap;
}
