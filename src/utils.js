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
