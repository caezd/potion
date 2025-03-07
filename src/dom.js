/**
 * @module dom
 */

/**
 * Enregistre les références d'éléments dans un objet de données.
 * Les éléments doivent avoir un attribut "#ref".
 * @param {Element} container Le container du rendu.
 * @param {Object} data Les données de l'application.
 */
export function registerRefs(container, data) {
    const refs = {};
    // Recherche les éléments ayant l'attribut "#ref" dans le container
    container.querySelectorAll("[\\#ref]").forEach((el) => {
        const refName = el.getAttribute("#ref");
        if (refName) {
            refs[refName] = el;
            el.removeAttribute("#ref");
        }
    });
    data.$refs = Object.assign({}, data.$refs, refs);
}

/**
 * Compare deux nœuds DOM et met à jour l'ancien nœud en fonction des différences.
 *
 * @param {Node} oldNode Le nœud existant dans le DOM.
 * @param {Node} newNode Le nouveau nœud généré.
 */
function diffNodes(oldNode, newNode) {
    if (
        oldNode.nodeType !== newNode.nodeType ||
        oldNode.nodeName !== newNode.nodeName
    ) {
        oldNode.parentNode.replaceChild(newNode.cloneNode(true), oldNode);
        return;
    }
    if (oldNode.nodeType === Node.TEXT_NODE) {
        if (oldNode.textContent !== newNode.textContent) {
            oldNode.textContent = newNode.textContent;
        }
        return;
    }
    if (oldNode.nodeType === Node.ELEMENT_NODE) {
        Array.from(newNode.attributes).forEach((attr) => {
            if (attr.name.startsWith("@") || attr.name.startsWith("#")) return;
            if (oldNode.getAttribute(attr.name) !== attr.value) {
                oldNode.setAttribute(attr.name, attr.value);
            }
        });
        Array.from(oldNode.attributes).forEach((attr) => {
            if (attr.name.startsWith("@") || attr.name.startsWith("#")) return;
            if (!newNode.hasAttribute(attr.name)) {
                oldNode.removeAttribute(attr.name);
            }
        });
        const oldChildren = Array.from(oldNode.childNodes);
        const newChildren = Array.from(newNode.childNodes);
        const max = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < max; i++) {
            if (i >= oldChildren.length) {
                oldNode.appendChild(newChildren[i].cloneNode(true));
            } else if (i >= newChildren.length) {
                oldNode.removeChild(oldChildren[i]);
            } else {
                diffNodes(oldChildren[i], newChildren[i]);
            }
        }
    }
}

/**
 * Met à jour le DOM en comparant un HTML généré avec l'état actuel.
 *
 * @param {Element} containerElement L'élément container du rendu.
 * @param {string} newHTML Le nouveau HTML généré.
 */
export function updateDOM(containerElement, newHTML) {
    const tagName = containerElement.tagName.toLowerCase();

    const parser = new DOMParser();
    const newDoc = parser.parseFromString(
        `<${tagName}>${newHTML}</${tagName}>`,
        "text/html"
    );
    const newContainer = newDoc.body.firstChild;

    // Recopier les attributs du container existant
    [...containerElement.attributes].forEach((attr) => {
        newContainer.setAttribute(attr.name, attr.value);
    });

    diffNodes(containerElement, newContainer);
}
