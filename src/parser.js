/**
 * @module parser
 */

import { escapeRegex } from "./utils.js";
import { applyFilter } from "./filters.js";

let uniqueCounter = 0;
const localContexts = new Map();

// Cache pour la tokenisation des templates
const tokenCache = new Map();

/**
 * Analyse un template et le découpe en segments statiques et tokens.
 * Chaque token est représenté par un objet { type: "token", value, flag }.
 *
 * @param {string} template La chaîne du template.
 * @param {Object} settings La configuration (start, end, path).
 * @returns {Array<Object>} Le tableau des segments.
 */
function tokenizeTemplate(template, settings) {
    // Le pattern capture un flag optionnel ("!" ou "/") suivi du token.
    const pattern = new RegExp(
        `${escapeRegex(settings.start)}\\s*([!\\/]?)\\s*(${
            settings.path
        })\\s*${escapeRegex(settings.end)}`,
        "gi"
    );
    let tokens = [];
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(template)) !== null) {
        // Ajoute le segment statique avant le token
        if (match.index > lastIndex) {
            tokens.push({
                type: "static",
                value: template.slice(lastIndex, match.index),
            });
        }
        // Ajoute le token, avec match[1] comme flag ("" pour ouverture, "/" pour fermeture, éventuellement "!")
        tokens.push({
            type: "token",
            flag: match[1],
            value: match[2],
        });
        lastIndex = pattern.lastIndex;
    }
    // Ajoute le reste du template s'il existe
    if (lastIndex < template.length) {
        tokens.push({
            type: "static",
            value: template.slice(lastIndex),
        });
    }
    return tokens;
}

/**
 * Retourne les tokens pour un template donné en utilisant le cache.
 *
 * @param {string} template Le template à tokeniser.
 * @param {Object} settings Les paramètres de configuration.
 * @returns {Array<Object>} Le tableau des tokens.
 */
function getTokens(template, settings) {
    if (tokenCache.has(template)) {
        return tokenCache.get(template);
    }
    const tokens = tokenizeTemplate(template, settings);
    tokenCache.set(template, tokens);
    return tokens;
}

/**
 * Effectue la substitution sur un template en utilisant les tokens pré-analyzés,
 * et gère les blocs conditionnels et les boucles.
 *
 * @param {string} template Le template original.
 * @param {Object} data Les données pour la substitution.
 * @param {Object} settings La configuration (start, end, path).
 * @returns {string} Le template rendu.
 */
export function substitute(template, data, settings) {
    const tokens = getTokens(template, settings);
    let output = "";
    let index = 0;

    while (index < tokens.length) {
        const segment = tokens[index];
        if (segment.type === "static") {
            output += segment.value;
            index++;
        } else if (segment.type === "token") {
            // Si c'est un token de fermeture, on l'ignore
            if (segment.flag === "/") {
                index++;
                continue;
            }
            // Chercher le bloc correspondant (token de fermeture avec le même value)
            let innerTokens = [];
            let j = index + 1;
            let foundClosing = false;
            while (j < tokens.length) {
                const nextSegment = tokens[j];
                if (
                    nextSegment.type === "token" &&
                    nextSegment.flag === "/" &&
                    nextSegment.value === segment.value
                ) {
                    foundClosing = true;
                    break;
                }
                innerTokens.push(nextSegment);
                j++;
            }
            let substituted;
            try {
                substituted = applyFilter(
                    "token",
                    segment.value,
                    data,
                    template
                );
            } catch (e) {
                console.warn(e.message);
                substituted = "";
            }
            if (foundClosing) {
                // Reconstituer le contenu du bloc à partir des innerTokens
                const innerTemplate = innerTokens
                    .map((tok) => {
                        if (tok.type === "static") {
                            return tok.value;
                        } else {
                            return `${settings.start}${
                                tok.flag ? tok.flag : ""
                            }${tok.value}${settings.end}`;
                        }
                    })
                    .join("");

                if (typeof substituted === "boolean") {
                    output += substituted
                        ? substitute(innerTemplate, data, settings)
                        : "";
                } else if (typeof substituted === "object") {
                    // Cas de boucle : substitution pour chaque clé de l'objet
                    for (const key in substituted) {
                        if (substituted.hasOwnProperty(key)) {
                            // Construire les données locales pour cette itération
                            const loopData = Object.assign(
                                {},
                                substituted[key],
                                {
                                    _key: key,
                                    _value: substituted[key],
                                }
                            );
                            // Rendu du bloc pour cette itération (récursivité sur le innerTemplate)
                            let renderedBlock = substitute(
                                innerTemplate,
                                loopData,
                                settings
                            ).trim();
                            // Générer un identifiant unique
                            const uniqueId = "potion_" + uniqueCounter++;
                            // Stocker le contexte local dans la Map
                            localContexts.set(uniqueId, loopData);
                            // Injecter data-potion-key dans la première balise du rendu
                            renderedBlock = renderedBlock.replace(
                                /^\s*<([a-zA-Z0-9-]+)/,
                                `<$1 data-potion-key="${uniqueId}"`
                            );
                            output += renderedBlock;
                        }
                    }
                } else {
                    output += substituted;
                }
                index = j + 1; // Passer après le token de fermeture
            } else {
                // Pas de bloc trouvé : substitution simple
                output += substituted;
                index++;
            }
        }
    }
    return output;
}

/**
 * Expose la Map des contextes locaux pour une utilisation externe.
 * @type {Map<string, Object>}
 */
export const localContextsMap = localContexts;

/**
 * Pour éviter les dépendances circulaires, la fonction Potion utilisée ici
 * sera fournie par l'API publique (voir index.js).
 * On peut déclarer ici une fonction d'assistance pour le rendu d'itération.
 *
 * @param {string} templateStr Le template d'itération.
 * @param {Object} loopData Les données de l'itération.
 * @returns {string} Le rendu de l'itération.
 */
export function renderIteration(templateStr, loopData) {
    // Vous pouvez ici choisir d'appeler la fonction Potion exportée par l'API
    // Par simplicité, on suppose que Potion est accessible globalement ou via une importation.
    return window.Potion ? window.Potion(templateStr, loopData) : templateStr;
}
