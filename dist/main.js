var Potion = (function () {
    'use strict';

    function Potion(template, data, customSettings = {}) {
        const defaultSettings = {
            start: "{{",
            end: "}}",
            path: "[a-z0-9_$][\\.a-z0-9_]*",
        };

        const settings = { ...defaultSettings, ...customSettings };
        const filters = {};
        let templates = {};
        let initialized = false;

        const pattern = new RegExp(
            `\${settings.start}\s*(${settings.path})\s*\${settings.end}`,
            "gi"
        );

        function init() {
            addFilter("token", (token, data, tag) => {
                const path = token.split(".");
                let dataLookup = data;

                for (let i = 0; i < path.length; i++) {
                    if (
                        !Object.prototype.hasOwnProperty.call(dataLookup, path[i])
                    ) {
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

            addFilter("init", () => {
                console.log("init");
            });
        }

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
            }
            return payload;
        }

        function substitute(template, data) {
            let match;

            while ((match = pattern.exec(template)) !== null) {
                const token = match[1];
                let substituted = applyFilter("token", token, data, template);

                const startPos = match.index;
                const endPos = pattern.lastIndex;
                const templateStart = template.slice(0, startPos);
                let templateEnd = template.slice(endPos);

                if (typeof substituted === "function") {
                    substituted = substituted.call(data);
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
                            subTemplate = substituted ? innerTemplate : "";
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

        function create(template, data) {
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

        // Initial setup
        init();

        // Render the template
        return create(template, data);
    }

    return Potion;

})();
