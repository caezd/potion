function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

var potion = (function initPotion(template, data, customSettings = {}) {
    const localContexts = new Map();
    let uniqueCounter = 0;

    const defaultSettings = {
        start: "[",
        end: "]",
        path: "[a-z0-9_$][\\.a-z0-9_]*",
    };

    const settings = { ...defaultSettings, ...customSettings };
    const filters = {};
    let templates = {};
    let initialized = false;
    let stopThisFilter = false;

    const pattern = new RegExp(
        `${escapeRegex(settings.start)}\\s*(!?)\\s*(${
            settings.path
        })\\s*${escapeRegex(settings.end)}`,
        "gi"
    );

    function addFilter(name, fn, priority = 0) {
        if (typeof name !== "string" || typeof fn !== "function") {
            throw new TypeError(
                "Invalid arguments: 'name' must be a string and 'fn' must be a function."
            );
        }
        filters[name] = filters[name] || [];
        filters[name].push([fn, priority]);
        filters[name].sort((a, b) => a[1] - b[1]);
    }

    addFilter("token", (token, data, tag) => {
        const path = token.split(".");
        let dataLookup = data;

        for (let i = 0; i < path.length; i++) {
            if (!Object.prototype.hasOwnProperty.call(dataLookup, path[i])) {
                throw new Error(
                    `Potion: '${path[i]}' not found${i ? ` in ${tag}` : ""}`
                );
            }

            dataLookup = dataLookup[path[i]];

            if (i === path.length - 1) {
                return dataLookup;
            }
        }
    });

    function applyFilter(name, payload, ...args) {
        return (filters[name] || []).reduce((result, [fn]) => {
            if (stopThisFilter) {
                stopThisFilter = false;
                return result;
            }
            const substituted = fn(result, ...args);
            return substituted !== undefined ? substituted : "";
        }, payload);
    }

    function substitute(template, data) {
        let match;

        while ((match = pattern.exec(template)) !== null) {
            const token = match[2];
            let substituted = applyFilter("token", token, data, template);
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
                const closeToken = `${settings.start}/${token}${settings.end}`;
                const closePos = templateEnd.indexOf(closeToken);

                if (closePos >= 0) {
                    const innerTemplate = templateEnd.slice(0, closePos);
                    templateEnd = templateEnd.slice(
                        closePos + closeToken.length
                    );

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
                                // Générer le rendu de l'itération
                                let loopStr = Potion(innerTemplate, loopData);
                                // Générer un identifiant unique pour cette itération
                                const uniqueId = "potion_" + uniqueCounter++;
                                // Stocker le contexte local dans la Map
                                localContexts.set(uniqueId, loopData);
                                // Injecter l'attribut dans la première balise de loopStr sans ajouter de conteneur supplémentaire
                                if (loopStr) {
                                    // Cette regex détecte la première balise
                                    loopStr = loopStr.replace(
                                        /<([a-zA-Z0-9-]+)/,
                                        `<$1 data-potion-key="${uniqueId}"`
                                    );
                                }
                                subTemplate += applyFilter(
                                    "loop",
                                    loopStr,
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

    function getLocalContext(element, defaultData) {
        let el = element;
        while (el && el !== document.body) {
            const key = el.getAttribute("data-potion-key");
            if (key) {
                const context = localContexts.get(key);
                if (context !== undefined) {
                    return context;
                }
            }
            el = el.parentElement;
        }
        return defaultData;
    }

    function templatesCache(key, value) {
        if (typeof key === "string") {
            if (value === undefined) {
                return templates[key] || "";
            } else if (value === false) {
                delete templates[key];
            } else {
                templates[key] = value;
            }
        } else if (typeof key === "object" && key !== null) {
            Object.keys(key).forEach((t) => {
                templatesCache(t, key[t]);
            });
        } else if (typeof key === "boolean" && !key) {
            templates = {};
        }
        return templates;
    }

    function parseEventArgs(arg, data) {
        if (arg === "true") return true;
        if (arg === "false") return false;
        if (!isNaN(arg)) return Number(arg);
        return arg.match(/^["'](.*)["']$/)
            ? arg.slice(1, -1)
            : data[arg] || arg;
    }

    function bindEvents(element, data) {
        [...element.attributes]
            .filter((attr) => attr.name.startsWith("@"))
            .forEach((attr) => {
                // Exemple : "@click.stop.prevent.left" ou "@keyup.ctrl.shift.enter.exact"
                const parts = attr.name.slice(1).split(".");
                const eventType = parts[0];
                const modifiers = parts.slice(1);

                // On accepte une expression du type "nomFonction(args)" ou simplement "nomFonction"
                const regex = /^(\w+)(?:\((.*)\))?$/;
                const match = attr.value.match(regex);
                if (!match) {
                    console.warn(
                        "Potion: impossible de parser l'expression de l'événement:",
                        attr.value
                    );
                    return;
                }
                const fnName = match[1];
                const argsStr = match[2] || "";
                const localData = getLocalContext(element, data);
                const args = argsStr
                    ? argsStr
                          .split(",")
                          .map((arg) => parseEventArgs(arg.trim(), localData))
                    : [];

                if (typeof data[fnName] === "function") {
                    // Supprimer un éventuel listener existant
                    element.removeEventListener(
                        eventType,
                        element._boundEvents?.[eventType]
                    );

                    const handler = (event) => {
                        // Modifiers standards
                        if (
                            modifiers.includes("self") &&
                            event.target !== event.currentTarget
                        )
                            return;
                        if (modifiers.includes("prevent"))
                            event.preventDefault();
                        if (modifiers.includes("stop")) event.stopPropagation();
                        if (
                            modifiers.includes("stopImmediate") &&
                            event.stopImmediatePropagation
                        )
                            event.stopImmediatePropagation();

                        // Pour les événements souris
                        if (event instanceof MouseEvent) {
                            if (
                                modifiers.includes("left") &&
                                event.button !== 0
                            )
                                return;
                            if (
                                modifiers.includes("right") &&
                                event.button !== 2
                            )
                                return;
                            if (
                                modifiers.includes("middle") &&
                                event.button !== 1
                            )
                                return;
                        }

                        // Pour les événements clavier
                        if (event instanceof KeyboardEvent) {
                            // Vérifier que les modifiers de touches sont activés si spécifiés
                            if (modifiers.includes("ctrl") && !event.ctrlKey)
                                return;
                            if (modifiers.includes("shift") && !event.shiftKey)
                                return;
                            if (modifiers.includes("alt") && !event.altKey)
                                return;
                            if (modifiers.includes("meta") && !event.metaKey)
                                return;

                            // Vérifier les touches spécifiques
                            if (
                                modifiers.includes("enter") &&
                                event.key !== "Enter"
                            )
                                return;
                            if (
                                modifiers.includes("tab") &&
                                event.key !== "Tab"
                            )
                                return;
                            if (
                                modifiers.includes("delete") &&
                                event.key !== "Delete" &&
                                event.key !== "Backspace"
                            )
                                return;
                            if (
                                modifiers.includes("esc") &&
                                event.key !== "Escape"
                            )
                                return;
                            if (
                                modifiers.includes("space") &&
                                !(
                                    event.key === " " ||
                                    event.key === "Spacebar" ||
                                    event.key === "Space"
                                )
                            )
                                return;
                            if (
                                modifiers.includes("up") &&
                                event.key !== "ArrowUp"
                            )
                                return;
                            if (
                                modifiers.includes("down") &&
                                event.key !== "ArrowDown"
                            )
                                return;
                            // Pour clavier, on réutilise "left" et "right" pour ArrowLeft/ArrowRight
                            if (
                                modifiers.includes("left") &&
                                event.key !== "ArrowLeft"
                            )
                                return;
                            if (
                                modifiers.includes("right") &&
                                event.key !== "ArrowRight"
                            )
                                return;

                            // exact : seules les touches spécifiées doivent être activées
                            if (modifiers.includes("exact")) {
                                // On définit quels modifiers doivent être activés selon la présence dans l'attribut
                                const mustCtrl = modifiers.includes("ctrl");
                                const mustShift = modifiers.includes("shift");
                                const mustAlt = modifiers.includes("alt");
                                const mustMeta = modifiers.includes("meta");
                                if (
                                    event.ctrlKey !== mustCtrl ||
                                    event.shiftKey !== mustShift ||
                                    event.altKey !== mustAlt ||
                                    event.metaKey !== mustMeta
                                ) {
                                    return;
                                }
                            }
                        }

                        data[fnName](event, ...args);
                    };

                    element._boundEvents = {
                        ...element._boundEvents,
                        [eventType]: handler,
                    };

                    const options = {};
                    if (modifiers.includes("capture")) options.capture = true;
                    if (modifiers.includes("once")) options.once = true;
                    if (modifiers.includes("passive")) options.passive = true;

                    element.addEventListener(eventType, handler, options);
                } else {
                    console.warn(
                        `Potion: function '${fnName}' not found in data.`
                    );
                }
                // Supprimer l'attribut pour éviter sa réinjection dans le DOM lors des diffings
                element.removeAttribute(attr.name);
            });
    }

    function Potion(template, data) {
        if (!initialized) {
            initialized = true;
            applyFilter("init");
        }

        template = applyFilter("templateBefore", template);

        if (!template.includes(settings.start)) {
            const templateLookup = templatesCache(template);
            if (templateLookup) {
                template = templateLookup;
            }
        }

        template = applyFilter("template", template);

        if (template && data !== undefined) {
            template = substitute(template, data);
        }

        return applyFilter("templateAfter", template);
    }

    function createContainerFromTemplate(
        templateElement,
        templateName,
        data,
        customSettings = {}
    ) {
        // Générer le rendu initial avec Potion
        const renderedHTML = Potion(
            templateElement.innerHTML,
            data,
            customSettings
        );

        // Créer un conteneur pour le rendu
        const container = document.createElement("div");
        container.innerHTML = renderedHTML;

        // Binder les événements sur le conteneur et ses descendants...
        bindEvents(container, data);
        container
            .querySelectorAll("*")
            .forEach((child) => bindEvents(child, data));

        // Remplacer le template par le conteneur dans le DOM
        templateElement.parentNode.replaceChild(container, templateElement);

        return container;
    }

    if (window && window.document) {
        const type = settings.type || "template/potion";
        const attr = settings.attr || "data-name";
        const elements = document.querySelectorAll(`template[type='${type}']`);

        Potion.renderFromDOM = function () {
            const templatesInDom = {};
            elements.forEach((elem, i) => {
                const key = elem.getAttribute(attr) || `potion-${i}`;
                templatesInDom[key] = elem.innerHTML;
            });

            templatesCache(templatesInDom);
            return templatesInDom;
        };

        Potion.renderFromDOM();

        Potion.render = function (name, data, customSettings = {}) {
            const templateElement = document.querySelector(
                `template[data-name='${name}']`
            );
            if (!templateElement)
                throw new Error(
                    `Potion: template with name '${name}' not found`
                );
            return createContainerFromTemplate(
                templateElement,
                name,
                data,
                customSettings
            );
        };

        /**
         * FIBER VIRTUAL DOM
         * @param {*} templateName
         * @param {*} data
         */

        Potion.sync = renderSync;

        function renderSync(templateName, data) {
            // Récupérer le template dans le DOM
            const templateElement = document.querySelector(
                `template[data-name='${templateName}']`
            );
            if (!templateElement) {
                throw new Error(
                    `Potion: template with name '${templateName}' not found`
                );
            }

            // Créer un conteneur qui recevra le rendu et remplacer le template dans le DOM
            const containerElement = createContainerFromTemplate(
                templateElement,
                templateName,
                data
            );

            // --- Diffing algorithm minimal ---
            // Compare deux nœuds et met à jour le nœud existant avec les modifications du nouveau nœud.
            function diffNodes(oldNode, newNode) {
                // Si les types ou noms diffèrent, remplacer le nœud complet
                if (
                    oldNode.nodeType !== newNode.nodeType ||
                    oldNode.nodeName !== newNode.nodeName
                ) {
                    oldNode.parentNode.replaceChild(
                        newNode.cloneNode(true),
                        oldNode
                    );
                    return;
                }
                // Si c'est un nœud texte, comparer le contenu
                if (oldNode.nodeType === Node.TEXT_NODE) {
                    if (oldNode.textContent !== newNode.textContent) {
                        oldNode.textContent = newNode.textContent;
                    }
                    return;
                }
                // Pour un élément, mettre à jour les attributs (en ignorant ceux commençant par "@")
                if (oldNode.nodeType === Node.ELEMENT_NODE) {
                    // Mettre à jour ou ajouter les attributs (sauf les @)
                    Array.from(newNode.attributes).forEach((attr) => {
                        if (attr.name.startsWith("@")) return;
                        if (oldNode.getAttribute(attr.name) !== attr.value) {
                            oldNode.setAttribute(attr.name, attr.value);
                        }
                    });
                    // Supprimer les attributs absents dans newNode (en ignorant ceux commençant par "@")
                    Array.from(oldNode.attributes).forEach((attr) => {
                        if (attr.name.startsWith("@")) return;
                        if (!newNode.hasAttribute(attr.name)) {
                            oldNode.removeAttribute(attr.name);
                        }
                    });
                    // Traiter les enfants
                    const oldChildren = oldNode.childNodes;
                    const newChildren = newNode.childNodes;
                    const max = Math.max(
                        oldChildren.length,
                        newChildren.length
                    );
                    for (let i = 0; i < max; i++) {
                        if (i >= oldChildren.length) {
                            // Ajouter le nouveau nœud manquant
                            oldNode.appendChild(newChildren[i].cloneNode(true));
                        } else if (i >= newChildren.length) {
                            // Supprimer l'excédent de nœuds
                            oldNode.removeChild(oldChildren[i]);
                        } else {
                            // Comparer récursivement
                            diffNodes(oldChildren[i], newChildren[i]);
                        }
                    }
                }
            }

            // Fonction qui applique le diff entre l'état actuel du conteneur et le nouveau rendu
            function updateDOM(newHTML) {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(
                    `<div>${newHTML}</div>`,
                    "text/html"
                );
                const newContainer = newDoc.body.firstChild;
                diffNodes(containerElement, newContainer);
            }

            // --- Création d'un Proxy réactif profond ---
            function deepProxy(target) {
                if (typeof target !== "object" || target === null)
                    return target;
                return new Proxy(target, {
                    get(obj, prop) {
                        const value = Reflect.get(obj, prop);
                        return deepProxy(value);
                    },
                    set(obj, prop, value) {
                        const oldValue = obj[prop];
                        const result = Reflect.set(obj, prop, value);
                        if (oldValue !== value) {
                            const updatedHTML = Potion(templateName, data);
                            updateDOM(updatedHTML);
                            // Réassocier les événements après mise à jour
                            bindEvents(containerElement, data);
                            containerElement
                                .querySelectorAll("*")
                                .forEach((child) => bindEvents(child, data));
                        }
                        return result;
                    },
                });
            }

            return deepProxy(data);
        }
    }

    // Render the template
    return Potion;
})();

export default potion;
