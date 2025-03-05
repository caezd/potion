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

// Fonction pour extraire les templates imbriqués et les protéger
function protectNestedTemplates(templateStr) {
    const nestedTemplates = {};
    let counter = 0;
    // On utilise une regex qui capture les balises <template> imbriquées
    const regex = /<template\b[^>]*>([\s\S]*?)<\/template>/gi;
    const protectedStr = templateStr.replace(regex, (match) => {
        const placeholder = `__NESTED_TEMPLATE_${counter}__`;
        nestedTemplates[placeholder] = match;
        counter++;
        return placeholder;
    });
    return { protectedStr, nestedTemplates };
}

// Fonction pour restaurer les templates imbriqués après substitution
function restoreNestedTemplates(templateStr, nestedTemplates) {
    for (const placeholder in nestedTemplates) {
        templateStr = templateStr.replace(
            placeholder,
            nestedTemplates[placeholder]
        );
    }
    return templateStr;
}

// Fonction de substitution "protégée"
export function safeSubstitute(templateStr, data, settings) {
    // Protéger les templates imbriqués
    const { protectedStr, nestedTemplates } =
        protectNestedTemplates(templateStr);
    // Appliquer la substitution sur le contenu protégé
    let substituted = substitute(protectedStr, data, settings);
    // Restaurer les templates imbriqués intacts
    substituted = restoreNestedTemplates(substituted, nestedTemplates);
    return substituted;
}

function parseFilterArguments(argString) {
    // On commence par trimper l'ensemble de la chaîne d'arguments
    argString = argString.trim();
    const args = [];
    // Ce regex capture :
    //  • un argument entre guillemets doubles : "([^"]*)"
    //  • ou entre guillemets simples : '([^']*)'
    //  • ou un argument non cité : ([^,]+)
    // suivis d'une virgule optionnelle et d'espaces
    const regex = /(?:"([^"]*)"|'([^']*)'|([^,]+))(?:,\s*)?/g;
    let match;
    while ((match = regex.exec(argString)) !== null) {
        if (match[1] !== undefined) {
            // Argument entre guillemets doubles (le groupe 1 ne contient pas les quotes)
            args.push(match[1]);
        } else if (match[2] !== undefined) {
            // Argument entre guillemets simples
            args.push(match[2]);
        } else if (match[3] !== undefined) {
            // Argument non cité, on applique trim
            args.push(match[3].trim());
        }
    }
    return args;
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
            // Ignore le token de fermeture
            if (segment.flag === "/") {
                index++;
                continue;
            }

            // Découpe la valeur du token pour extraire la clé et la chaîne de filtres
            const parts = segment.value.split("|").map((s) => s.trim());
            const tokenKey = parts[0];

            // Recherche d'un bloc de fermeture associé (pour les blocs conditionnels ou les boucles)
            let innerTokens = [];
            let j = index + 1;
            let foundClosing = false;
            while (j < tokens.length) {
                const nextSegment = tokens[j];
                // Pour la fermeture, on compare uniquement la clé sans filtres
                if (
                    nextSegment.type === "token" &&
                    nextSegment.flag === "/" &&
                    nextSegment.value.trim() === tokenKey
                ) {
                    foundClosing = true;
                    break;
                }
                innerTokens.push(nextSegment);
                j++;
            }

            let substituted;
            try {
                // On récupère la valeur initiale du token via le filtre par défaut "token"
                substituted = applyFilter("token", tokenKey, data, template);
            } catch (e) {
                console.warn(e.message);
                substituted = "";
            }

            // Si des filtres additionnels sont présents, on les applique successivement
            for (let i = 1; i < parts.length; i++) {
                let filterSpec = parts[i]; // ex. "truncate: 100, \"…\"" ou "join: ', '"
                let filterName = filterSpec;
                let filterArgs = [];
                if (filterSpec.indexOf(":") !== -1) {
                    let [name, argString] = filterSpec.split(":", 2);
                    filterName = name.trim();
                    // Utilisation de la fonction dédiée pour parser les arguments
                    filterArgs = parseFilterArguments(argString);
                }
                substituted = applyFilter(
                    filterName,
                    substituted,
                    data,
                    template,
                    ...filterArgs
                );
            }

            if (foundClosing) {
                // Cas d'un bloc
                const innerTemplate = innerTokens
                    .map((tok) =>
                        tok.type === "static"
                            ? tok.value
                            : `${settings.start}${tok.flag ? tok.flag : ""}${
                                  tok.value
                              }${settings.end}`
                    )
                    .join("");

                if (typeof substituted === "boolean") {
                    output += substituted
                        ? substitute(innerTemplate, data, settings)
                        : "";
                } else if (typeof substituted === "object") {
                    // Cas de boucle (itération sur un objet)
                    for (const key in substituted) {
                        if (substituted.hasOwnProperty(key)) {
                            const loopData = Object.assign(
                                {},
                                substituted[key],
                                {
                                    _key: key,
                                    _value: substituted[key],
                                }
                            );
                            let renderedBlock = substitute(
                                innerTemplate,
                                loopData,
                                settings
                            ).trim();
                            const uniqueId = "potion_" + uniqueCounter++;
                            localContexts.set(uniqueId, loopData);
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
                // Cas de substitution simple
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
