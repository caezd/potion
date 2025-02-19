/**
 * @module filters
 */

const filters = {};

/**
 * Ajoute un filtre pour la substitution des tokens.
 *
 * @param {string} name - Le nom du filtre.
 * @param {function} fn - La fonction de filtre.
 * @param {number} [priority=0] - La priorité d'exécution.
 * @throws {TypeError} Si le nom n'est pas une chaîne ou si fn n'est pas une fonction.
 */
export function addFilter(name, fn, priority = 0) {
    if (typeof name !== "string" || typeof fn !== "function") {
        throw new TypeError(
            "Invalid arguments: 'name' must be a string and 'fn' must be a function."
        );
    }
    filters[name] = filters[name] || [];
    filters[name].push([fn, priority]);
    filters[name].sort((a, b) => a[1] - b[1]);
}

/**
 * Applique un filtre sur un payload donné.
 *
 * @param {string} name - Le nom du filtre.
 * @param {*} payload - La valeur initiale.
 * @param {...*} args - Arguments additionnels pour le filtre.
 * @returns {*} Le résultat après application des filtres.
 */
export function applyFilter(name, payload, ...args) {
    let stopThisFilter = false;
    return (filters[name] || []).reduce((result, [fn]) => {
        if (stopThisFilter) {
            stopThisFilter = false;
            return result;
        }
        const substituted = fn(result, ...args);
        return substituted !== undefined ? substituted : "";
    }, payload);
}

// Filtre par défaut pour la substitution des tokens
addFilter("token", (token, data, tag) => {
    const path = token.split(".");
    let dataLookup = data;
    for (let i = 0; i < path.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(dataLookup, path[i])) {
            return "";
        }
        dataLookup = dataLookup[path[i]];
    }
    return dataLookup;
});

export { filters };
