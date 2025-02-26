/**
 * @module utils
 */

/**
 * Échappe une chaîne pour être utilisée dans une expression régulière.
 * @param {string} string La chaîne à échapper.
 * @returns {string} La chaîne échappée.
 */
export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Déclenche la fonction fournie après un délai,
 * et réinitialise le timer si la fonction est appelée à nouveau avant ce délai.
 *
 * @param {Function} func La fonction à exécuter.
 * @param {number} wait Le délai en millisecondes.
 * @returns {Function} Une fonction debounce.
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Vérifie si une chaîne correspond à un tag HTML valide.
 *
 * @param {string} tagName Le nom du tag à tester.
 * @returns {boolean} true si c'est un élément valide, false sinon.
 */
export function isValidHTMLElement(tagName) {
    const el = document.createElement(tagName);
    return !(el instanceof HTMLUnknownElement);
}

/**
 * Évalue une expression simple (accès par point et appels de fonctions avec arguments littéraux)
 * dans un contexte donné.
 *
 * Exemple supporté : "$root.classList.add('boudin')"
 *
 * @param {string} expr L'expression à évaluer.
 * @param {Object} context Le contexte dans lequel évaluer l'expression.
 * @returns {*} Le résultat de l'évaluation.
 * @throws {Error} Si une partie de l'expression est introuvable.
 */
export function evaluateExpression(expr, context) {
    // Suppression des espaces en début/fin
    expr = expr.trim();
    // Découpage par points
    const parts = expr.split(".");
    let result = context;
    for (let part of parts) {
        // Vérifie si la partie correspond à un appel de fonction, par exemple "add('boudin')"
        const funcCall = part.match(/^(\w+)\((.*)\)$/);
        if (funcCall) {
            const fnName = funcCall[1];
            let argString = funcCall[2].trim();
            let args = [];
            if (argString.length) {
                // On découpe les arguments par virgule (très basique – ne gère pas les virgules imbriquées)
                args = argString.split(",").map((s) => {
                    // Supprime les quotes simples ou doubles
                    return s.trim().replace(/^['"]|['"]$/g, "");
                });
            }
            if (result && typeof result[fnName] === "function") {
                result = result[fnName](...args);
            } else {
                throw new Error(`Function '${fnName}' not found in context.`);
            }
        } else {
            // Passage simple d'une propriété
            if (result && part in result) {
                result = result[part];
            } else {
                throw new Error(`Property '${part}' not found in context.`);
            }
        }
    }
    return result;
}
