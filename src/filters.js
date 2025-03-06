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
    if (dataLookup instanceof HTMLElement) {
        return dataLookup.outerHTML;
    }
    return dataLookup;
});

/**
 * Filtres pour string
 */

addFilter("uppercase", (value) =>
    typeof value === "string" ? value.toUpperCase() : value
);

addFilter("lowercase", (value) =>
    typeof value === "string" ? value.toLowerCase() : value
);

addFilter("capitalize", (value) =>
    typeof value === "string"
        ? value.charAt(0).toUpperCase() + value.slice(1)
        : value
);

addFilter("truncate", (value, data, template, length = 50, ellipsis = "") =>
    typeof value === "string" && value.length > length
        ? value.slice(0, length) + ellipsis
        : value
);

addFilter("trim", (value) =>
    typeof value === "string" ? value.trim() : value
);

addFilter("lstrip", (value) =>
    typeof value === "string" ? value.replace(/^\s+/, "") : value
);

addFilter("rstrip", (value) =>
    typeof value === "string" ? value.replace(/\s+$/, "") : value
);

addFilter("append", (value, data, template, suffix) =>
    typeof value === "string" ? value + suffix : value
);

addFilter("default", (value, data, template, defaultValue) =>
    value === null || value === undefined || value === "" ? defaultValue : value
);

addFilter("prepend", (value, data, template, prefix) =>
    typeof value === "string" ? prefix + value : value
);

addFilter("remove", (value, data, template, substring) =>
    typeof value === "string" ? value.split(substring).join("") : value
);

addFilter("remove_first", (value, data, template, substring) =>
    typeof value === "string" ? value.replace(substring, "") : value
);

addFilter("replace", (value, data, template, search, replacement) =>
    typeof value === "string" ? value.split(search).join(replacement) : value
);

addFilter("replace_first", (value, data, template, search, replacement) =>
    typeof value === "string" ? value.replace(search, replacement) : value
);

addFilter("split", (value, data, template, delimiter) =>
    typeof value === "string" ? value.split(delimiter) : value
);

addFilter("strip_html", (value) =>
    typeof value === "string" ? value.replace(/<[^>]+>/g, "") : value
);

addFilter("url_decode", (value) =>
    typeof value === "string" ? decodeURIComponent(value) : value
);

addFilter("url_encode", (value) =>
    typeof value === "string" ? encodeURIComponent(value) : value
);

/**
 * Filtres pour nombre
 */

addFilter("abs", (value) =>
    typeof value === "number" ? Math.abs(value) : value
);

addFilter("at_least", (value, data, template, min) =>
    typeof value === "number" ? Math.max(value, Number(min)) : value
);

addFilter("at_most", (value, data, template, max) =>
    typeof value === "number" ? Math.min(value, Number(max)) : value
);

addFilter("ceil", (value) =>
    typeof value === "number" ? Math.ceil(value) : value
);

addFilter("floor", (value) =>
    typeof value === "number" ? Math.floor(value) : value
);

addFilter("divided_by", (value, data, template, divisor) =>
    typeof Number(value) === "number" && Number(divisor) !== 0
        ? value / Number(divisor)
        : value
);

addFilter("minus", (value, data, template, number) =>
    typeof value === "number" ? value - Number(number) : value
);

addFilter("modulo", (value, data, template, divisor) =>
    typeof value === "number" && Number(divisor) !== 0
        ? value % Number(divisor)
        : value
);

addFilter("plus", (value, data, template, number) =>
    typeof value === "number" ? value + Number(number) : value
);

addFilter("round", (value, data, template, precision) => {
    if (typeof value === "number") {
        precision = Number(precision) || 0;
        const factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
    }
    return value;
});
addFilter("times", (value, data, template, multiplier) =>
    typeof value === "number" ? value * Number(multiplier) : value
);

addFilter("escape", (value) =>
    typeof value === "string"
        ? value
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;")
        : value
);

addFilter("size", (value) => {
    if (Array.isArray(value)) return value.length;
    if (typeof value === "string") return value.length;
    if (typeof value === "object" && value !== null)
        return Object.keys(value).length;
    return 0;
});

/**
 * Filtres pour tableaux
 */
addFilter("compact", (value) =>
    Array.isArray(value)
        ? value.filter((item) => item !== null && item !== undefined)
        : value
);
addFilter("first", (value) => {
    if (Array.isArray(value)) return value[0];
    if (typeof value === "string") return value.charAt(0);
    return value;
});
addFilter("last", (value) => {
    if (Array.isArray(value)) return value[value.length - 1];
    if (typeof value === "string") return value.charAt(value.length - 1);
    return value;
});
addFilter("join", (value, data, template, delimiter) =>
    Array.isArray(value) ? value.join(delimiter || "") : value
);
addFilter("map", (value, data, template, property) =>
    Array.isArray(value) ? value.map((item) => item[property]) : value
);
addFilter("reverse", (value) => {
    if (Array.isArray(value)) return [...value].reverse();
    if (typeof value === "string") return value.split("").reverse().join("");
    return value;
});
addFilter("slice", (value, data, template, start, length) => {
    if (typeof value === "string")
        return value.substring(Number(start), Number(length));
    if (Array.isArray(value))
        return value.slice(Number(start), Number(start) + Number(length));
    return value;
});
addFilter("sort", (value, data, template, property) => {
    if (Array.isArray(value)) {
        return property
            ? [...value].sort((a, b) => (a[property] > b[property] ? 1 : -1))
            : [...value].sort();
    }
    return value;
});
addFilter("unique", (value) =>
    Array.isArray(value) ? [...new Set(value)] : value
);

export { filters };
