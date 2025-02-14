function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

var potion = (function initPotion(template, data, customSettings = {}) {
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
        const fns = filters[name];
        if (!fns) return payload;

        for (const [fn] of fns) {
            const substituted = fn(payload, ...args);
            if (payload !== undefined && substituted !== undefined) {
                payload = substituted;
            }
            if (substituted == null) {
                payload = "";
            }
            if (stopThisFilter) {
                stopThisFilter = false;
                break;
            }
        }
        return payload;
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
                                const loop = Potion(innerTemplate, loopData);
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

    function bindEvents(element, data) {
        const attributes = [...element.attributes];

        attributes.forEach((attr) => {
            if (attr.name.startsWith("@")) {
                const eventType = attr.name.slice(1); // Ex: "click"
                let functionCall = attr.value.trim(); // Ex: "handleClick(42, 'test')"

                // Extraction du nom de la fonction et des arguments
                const match = functionCall.match(
                    /^([a-zA-Z_$][a-zA-Z0-9_$]*)\((.*)\)$/
                );
                let functionName,
                    args = [];

                if (match) {
                    functionName = match[1];
                    args = match[2]
                        .split(",")
                        .map((arg) => arg.trim())
                        .map((arg) => {
                            if (arg === "true") return true;
                            if (arg === "false") return false;
                            if (!isNaN(arg)) return Number(arg);
                            if (
                                (arg.startsWith("'") && arg.endsWith("'")) ||
                                (arg.startsWith('"') && arg.endsWith('"'))
                            ) {
                                return arg.slice(1, -1);
                            }
                            return data[arg] || arg;
                        });
                } else {
                    functionName = functionCall;
                }

                if (typeof data[functionName] === "function") {
                    element.removeEventListener(
                        eventType,
                        element._boundEvents?.[eventType]
                    );

                    const eventHandler = (event) => {
                        data[functionName].apply(data, [event, ...args]);
                    };

                    element.addEventListener(eventType, eventHandler);

                    element._boundEvents = element._boundEvents || {};
                    element._boundEvents[eventType] = eventHandler;
                } else {
                    console.warn(
                        `Potion: function '${functionName}' not found in data.`
                    );
                }
            }
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

    function replaceWithDiv(template, content, stgs = {}) {
        if (!(template instanceof HTMLTemplateElement)) {
            console.error("L'élément fourni n'est pas un `<template>`.");
            return;
        }

        const tagName = stgs.tag || "div";
        const newElement = document.createElement(tagName);
        newElement.innerHTML = content;

        [...template.attributes].forEach((attr) => {
            if (attr.name !== "type") {
                newElement.setAttribute(attr.name, attr.value);
            }
        });

        if (stgs.class) {
            newElement.classList.add(...stgs.class.split(" "));
        }
        /* events */
        [...newElement.querySelectorAll("*")].forEach((child) =>
            bindEvents(child, data)
        );
        template.parentNode.replaceChild(newElement, template);

        return newElement;
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

            const templateRendered = Potion(name, data, customSettings);
            return replaceWithDiv(
                templateElement,
                templateRendered,
                customSettings
            );
        };

        /**
         * FIBER
         * @param {*} templateName
         * @param {*} data
         */

        Potion.reactivity = renderPotionTemplate;

        function renderPotionTemplate(templateName, data) {
            const templateElement = document.querySelector(
                `template[data-name='${templateName}']`
            );
            if (!templateElement)
                throw new Error(
                    `Potion: template with name '${templateName}' not found`
                );

            const templateContent =
                templates[templateName] || templateElement.innerHTML;

            const fiberRoot = {
                dom: templateElement.parentNode,
                props: { children: [templateContent] },
                alternate: null,
            };

            function createDom(fiber) {
                const div = document.createElement("div");
                div.setAttribute("data-name", templateName);
                div.innerHTML = substitute(fiber.props.children[0], data);
                return div;
            }

            function commitRoot() {
                commitWork(fiberRoot.child);
            }

            function commitWork(fiber) {
                if (!fiber) return;

                const parentDom = fiber.parent.dom;
                if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
                    parentDom.appendChild(fiber.dom);
                } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
                    const newDom = createDom(fiber);
                    if (parentDom.contains(fiber.dom)) {
                        parentDom.replaceChild(newDom, fiber.dom);
                    } else {
                        parentDom.appendChild(newDom);
                    }
                    fiber.dom = newDom;
                }

                commitWork(fiber.child);
                commitWork(fiber.sibling);
                [...fiberRoot.dom.querySelectorAll("*")].forEach((child) =>
                    bindEvents(child, data)
                );
            }

            function workLoop() {
                if (!fiberRoot.child) {
                    fiberRoot.child = {
                        dom: createDom(fiberRoot),
                        parent: fiberRoot,
                        props: fiberRoot.props,
                        effectTag: "PLACEMENT",
                    };
                }
                commitRoot();
            }

            function arrayProxy(target, key, value) {
                if (Array.isArray(value)) {
                    value = new Proxy(value, arrayProxyHandler);
                }
                target[key] = value;
                fiberRoot.child.effectTag = "UPDATE";
                workLoop();
                return true;
            }

            const arrayProxyHandler = {
                set(target, key, value) {
                    if (key === "length" || target[key] === value) return true;
                    target[key] = value;
                    fiberRoot.child.effectTag = "UPDATE";
                    workLoop();
                    return true;
                },
                get(target, key) {
                    if (typeof target[key] === "function") {
                        return function (...args) {
                            const result = target[key].apply(target, args);
                            fiberRoot.child.effectTag = "UPDATE";
                            workLoop();
                            return result;
                        };
                    }
                    return target[key];
                },
            };

            const proxy = new Proxy(data, {
                set: arrayProxy,
                get(target, key) {
                    if (Array.isArray(target[key])) {
                        return new Proxy(target[key], arrayProxyHandler);
                    }
                    return target[key];
                },
            });

            workLoop();

            return proxy;
        }
    }

    // Render the template
    return Potion;
})();

export default potion;
