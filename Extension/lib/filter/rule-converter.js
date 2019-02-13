/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

(function (api) {

    /**
     * AdGuard scriptlet mask
     */
    const ADGUARD_SCRIPTLET_MASK = '${domains}#%#//scriptlet(${args})';
    /**
     * uBlock scriptlet rule mask
     */
    const UBO_SCRIPTLET_MASK_REG = /##script\:inject|##\s*\+js/;
    /**
     * AdBlock Plus snippet rule mask
     */
    const ABP_SCRIPTLET_MASK_REG = /#\$#/;

    /**
     * Get string before regexp first match
     * @param {string} rule
     * @param {RegExp} mask
     */
    function getBeforeRegExp(str, rx) {
        let index = str.search(rx);
        return str.substring(0, index);
    }

    /**
     * Return part of string after first regexp match
     * @param {string} str 
     * @param {RegExp} rx 
     */
    function getAfterRegExp(str, rx) {
        let start = str.search(rx);
        let matchLength;
        if (start === -1) {
            return str;
        }
        let match = str.match(rx);
        if (match && match.length) {
            matchLength = match[0].length;
        }
        return str.substring(start + matchLength, str.length);
    }

    /**
     * Return array of strings separated by space which not in quotes
     * @param {string} str 
     */
    function getSentences(str) {
        const reg = /'.*?'|".*?"|\S+/g;
        return str.match(reg);
    }

    /**
     * Returns substring enclosed in the widest braces
     * @param {string} str 
     */
    function getStringInBraces(str) {
        const firstIndex = str.indexOf('(');
        const lastIndex = str.lastIndexOf(')');
        return str.substring(firstIndex + 1, lastIndex);
    }

    /**
     * Wrap str in double qoutes and replaces single quotes if need
     * @param {string} str 
     */
    function wrapInDoubleQuotes(str) {
        if (str[0] === '\'' && str[str.length - 1] === '\'') {
            str = str.substring(1, str.length - 1);
        }
        return `"${str}"`
    }

    /**
     * Replace string with data by placeholders
     * @param {string} str 
     * @param {Object} data where keys is placeholdes names
     */
    function replacePlaceholders(str, data) {
        return Object.keys(data).reduce((acc, key) => {
            const reg = new RegExp(`\\$\\{${key}\\}`, 'g');
            acc = acc.replace(reg, data[key]);
            return acc;
        }, str);
    }

    /**
     * Convert string of UBO scriptlet rule to AdGuard scritlet rule
     * @param {string} rule UBO scriptlet rule
     */
    function convertUBOScriptletRule(rule) {
        const domains = getBeforeRegExp(rule, UBO_SCRIPTLET_MASK_REG);
        const args = getStringInBraces(rule)
            .split(/, /g)
            .map((arg, index) => index === 0 ? `ubo-${arg}` : arg)
            .map(arg => wrapInDoubleQuotes(arg))
            .join(', ');

        return replacePlaceholders(
            ADGUARD_SCRIPTLET_MASK,
            { domains, args }
        );
    }

    /**
     * Convert string of ABP scriptlet rule to AdGuard scritlet rule
     * @param {string} rule UBO scriptlet rule
     */
    function convertABPSnippetRule(rule) {
        const SEMICOLON_DIVIDER = /;(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
        const domains = getBeforeRegExp(rule, ABP_SCRIPTLET_MASK_REG);
        let args = getAfterRegExp(rule, ABP_SCRIPTLET_MASK_REG);
        return args.split(SEMICOLON_DIVIDER)
            .map(args => getSentences(args)
                .filter(arg => arg)
                .map((arg, index) => index === 0 ? `abp-${arg}` : arg)
                .map(arg => wrapInDoubleQuotes(arg))
                .join(', ')
            )
            .map(args => replacePlaceholders(ADGUARD_SCRIPTLET_MASK, { domains, args }))
    }

    /**
     * Check is uBO scriptlet rule
     * @param {string} rule rule text
     */
    function isUBOScriptletRule(rule) {
        return UBO_SCRIPTLET_MASK_REG.test(rule);
    };

    /**
     * Check is AdBlock Plus snippet
     * @param {string} rule rule text
     */
    function isABPSnippetRule(rule) {
        return ABP_SCRIPTLET_MASK_REG.test(rule);
    };

    /**
     * Convert externa scriptlet rule to AdGuard scriplet syntax
     * @param {string} rule convert rule
     */
    function convertRule(rule) {
        if (isUBOScriptletRule(rule)) {
            return convertUBOScriptletRule(rule);
        }
        if (isABPSnippetRule(rule)) {
            return convertABPSnippetRule(rule);
        }
        return rule;
    }

    api.ruleConverter = { convertRule };

})(adguard.rules);
