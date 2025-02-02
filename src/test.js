const desttings = {
    start: "[",
    end: "]",
    path: "[a-z0-9_$][\\.a-z0-9_]*",
};

const pattern = new RegExp(
    `${escapeRegex("[")}\s*(!?)\s*(${settings.path})\s*${escapeRegex("]")}`,
    "gi"
);

function substitute(template, data) {
    let match;

    while ((match = pattern.exec(template)) !== null) {
        const token = match[2];
        let substituted;

        const startPos = match.index;
        const endPos = pattern.lastIndex;
        const templateStart = template.slice(0, startPos);
        let templateEnd = template.slice(endPos);

        if (typeof substituted === "function") {
            substituted = substituted.call(data, data);
        }

        if (
            typeof substituted !== "boolean" &&
            typeof substituted !== "object"
        ) {
            template = templateStart + substituted + templateEnd;
        } else {
            let subTemplate = "";
            const closeToken = `${"["}/${token}${"]"}`;
            const closePos = templateEnd.indexOf(closeToken);

            if (closePos >= 0) {
                const innerTemplate = templateEnd.slice(0, closePos);
                templateEnd = templateEnd.slice(closePos + closeToken.length);

                if (typeof substituted === "boolean") {
                    subTemplate = !(substituted ^ (match[1] !== "!"))
                        ? innerTemplate
                        : "";
                } else {
                    for (const key in substituted) {
                        if (substituted.hasOwnProperty(key)) {
                            pattern.lastIndex = 0;
                            const loopData = applyFilter(
                                "loopData",
                                {
                                    _key: key,
                                    _value: substituted[key],
                                    ...substituted[key],
                                },
                                innerTemplate,
                                token
                            );
                            const loop = create(innerTemplate, loopData);
                            subTemplate += applyFilter(
                                "loop",
                                loop,
                                token,
                                loopData
                            );
                        }
                    }
                    subTemplate = applyFilter(
                        "loopEnd",
                        subTemplate,
                        token,
                        substituted
                    );
                }

                template = templateStart + subTemplate + templateEnd;
            } else {
                throw new Error(`Potion: '${token}' not closed`);
            }
        }

        pattern.lastIndex = 0;
    }

    return template;
}

function createFiberEngine(rootSelector, data) {
    const root = document.querySelector(rootSelector);
    const fiberTree = new Map(); // Arbre des nœuds à mettre à jour
    let isWorking = false; // Empêche l'exécution simultanée des mises à jour

    // 🔹 1. Analyse du DOM et association des tokens à leurs nœuds
    function createFiberTree() {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.childNodes.length === 0) continue; // Ignore les nœuds vides

            const originalHTML = node.innerHTML;
            const match = originalHTML.match(/\[([^\]]+)\]/g); // Trouve les tokens

            if (match) {
                match.forEach((token) => {
                    const cleanToken = token.replace(/[\[\]]/g, ""); // Nettoie les []
                    if (!fiberTree.has(cleanToken)) {
                        fiberTree.set(cleanToken, []);
                    }
                    fiberTree.get(cleanToken).push({ node, originalHTML });
                });
            }
        }
    }

    // 🔹 2. Met à jour les éléments du Fiber Tree de manière progressive
    function updateFiberTree() {
        if (isWorking) return;
        isWorking = true;

        function processNextFiber(deadline) {
            if (!deadline.timeRemaining()) {
                requestIdleCallback(processNextFiber);
                return;
            }

            if (fiberTree.size === 0) {
                isWorking = false;
                return;
            }

            const iterator = fiberTree.entries();
            const nextFiber = iterator.next();
            if (nextFiber.done) {
                isWorking = false;
                return;
            }

            const [key, fibers] = nextFiber.value;
            fibers.forEach(({ node, originalHTML }) => {
                node.innerHTML = substitute(originalHTML, data); // Réutilisation de ta fonction
            });

            requestIdleCallback(processNextFiber);
        }

        requestIdleCallback(processNextFiber);
    }

    // 🔹 3. Rendre les données réactives avec Proxy
    const reactiveData = new Proxy(data, {
        set(target, key, value) {
            target[key] = value;
            updateFiberTree();
            return true;
        },
    });

    // 🔹 4. Initialisation
    createFiberTree();
    updateFiberTree();

    return reactiveData;
}
export default createFiberEngine;
