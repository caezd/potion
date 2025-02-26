var MiniTemplate = (function () {
    'use strict';

    const pattern = new RegExp(
        `${escapeRegex("[")}\s*(!?)\s*(${settings.path})\s*${escapeRegex("]")}`,
        "gi"
    );

    function substitute(template, data) {
        let match;

        while ((match = pattern.exec(template)) !== null) {
            match[2];
            let substituted;

            const startPos = match.index;
            const endPos = pattern.lastIndex;
            const templateStart = template.slice(0, startPos);
            let templateEnd = template.slice(endPos);

            {
                template = templateStart + substituted + templateEnd;
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
                    node.innerHTML = substitute(originalHTML); // Réutilisation de ta fonction
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

    return createFiberEngine;

})();
