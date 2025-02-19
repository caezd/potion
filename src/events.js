/**
 * @module events
 */

import { localContextsMap } from "./parser.js";

/**
 * Récupère le contexte local en remontant dans l'arborescence du DOM.
 *
 * @param {Element} element L'élément DOM sur lequel commencer la recherche.
 * @param {Object} defaultData Le contexte global par défaut.
 * @returns {Object} Le contexte local trouvé ou defaultData.
 */
export function getLocalContext(element, defaultData) {
    let el = element;
    while (el && el !== document.body) {
        const key = el.getAttribute("data-potion-key");
        if (key) {
            const context = localContextsMap.get(key);
            if (context !== undefined) {
                return context;
            }
        }
        el = el.parentElement;
    }
    return defaultData;
}

/**
 * Convertit un argument textuel en sa valeur.
 *
 * @param {string} arg L'argument sous forme de chaîne.
 * @param {Object} data Les données à utiliser pour la résolution.
 * @returns {*} La valeur résolue.
 */
export function parseEventArgs(arg, data) {
    if (arg === "true") return true;
    if (arg === "false") return false;
    if (!isNaN(arg)) return Number(arg);
    const match = arg.match(/^["'](.*)["']$/);
    return match ? match[1] : data[arg] || arg;
}

/**
 * Lie les événements définis sur un élément en gérant les modifiers.
 *
 * @param {Element} element L'élément sur lequel binder les événements.
 * @param {Object} data L'objet global de données.
 */
export function bindEvents(element, data) {
    [...element.attributes]
        .filter((attr) => attr.name.startsWith("@"))
        .forEach((attr) => {
            const parts = attr.name.slice(1).split(".");
            const eventType = parts[0];
            const modifiers = parts.slice(1);
            const regex = /^(\w+)(?:\((.*)\))?$/;
            const match = attr.value.match(regex);
            if (!match) {
                console.warn(
                    "Potion: impossible de parser l'expression de l'événement:",
                    attr.value
                );
                return;
            }
            const fnName = match[1];
            const argsStr = match[2] || "";
            const localData = getLocalContext(element, data);
            const args = argsStr
                ? argsStr
                      .split(",")
                      .map((arg) => parseEventArgs(arg.trim(), localData))
                : [];
            const callback =
                typeof localData[fnName] === "function"
                    ? localData[fnName]
                    : typeof data[fnName] === "function"
                    ? data[fnName]
                    : null;

            if (typeof callback === "function") {
                element.removeEventListener(
                    eventType,
                    element._boundEvents?.[eventType]
                );
                const handler = (event) => {
                    if (
                        modifiers.includes("self") &&
                        event.target !== event.currentTarget
                    )
                        return;
                    if (modifiers.includes("prevent")) event.preventDefault();
                    if (modifiers.includes("stop")) event.stopPropagation();
                    if (
                        modifiers.includes("stopImmediate") &&
                        event.stopImmediatePropagation
                    )
                        event.stopImmediatePropagation();
                    // Autres vérifications pour MouseEvent/KeyboardEvent...
                    callback.call(localData, event, ...args);
                };
                element._boundEvents = {
                    ...element._boundEvents,
                    [eventType]: handler,
                };
                const options = {};
                if (modifiers.includes("capture")) options.capture = true;
                if (modifiers.includes("once")) options.once = true;
                if (modifiers.includes("passive")) options.passive = true;
                element.addEventListener(eventType, handler, options);
            } else {
                console.warn(
                    `Potion: function '${fnName}' not found in local context or data.`
                );
            }
            element.removeAttribute(attr.name);
        });
}
