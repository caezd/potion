/**
 * @module reactivity
 */

/**
 * Cache pour stocker les proxys déjà créés pour chaque objet.
 * WeakMap permet de ne pas empêcher la collecte de déchets.
 */
const proxyCache = new WeakMap();

/**
 * Crée un Proxy réactif profond pour observer un objet donné.
 * Optimisé en utilisant un cache pour éviter de créer plusieurs proxies pour le même objet.
 *
 * @param {Object} target L'objet à observer.
 * @param {Function} onChange Callback appelée lors d'une modification.
 * @param {number} [maxDepth=Infinity] Profondeur maximale d'observation.
 * @param {number} [currentDepth=0] (Usage interne) Profondeur actuelle.
 * @returns {Object} Le Proxy réactif.
 */
export function deepProxy(
    target,
    onChange,
    maxDepth = Infinity,
    currentDepth = 0
) {
    if (typeof target !== "object" || target === null) return target;
    // Si la profondeur maximale est atteinte, renvoyer l'objet sans Proxy
    if (currentDepth >= maxDepth) return target;

    // Vérifier si le Proxy existe déjà pour cet objet
    if (proxyCache.has(target)) {
        return proxyCache.get(target);
    }

    const proxy = new Proxy(target, {
        get(obj, prop) {
            const value = Reflect.get(obj, prop);
            // Proxyfier récursivement en augmentant la profondeur
            return deepProxy(value, onChange, maxDepth, currentDepth + 1);
        },
        set(obj, prop, value) {
            const oldValue = obj[prop];
            const result = Reflect.set(obj, prop, value);
            if (oldValue !== value) {
                onChange();
            }
            return result;
        },
    });
    proxyCache.set(target, proxy);
    return proxy;
}
