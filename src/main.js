class Potion {
    #initialized = false;

    #stopThisFilter = false;

    static version() {
        return "1.0.0";
    }
    /**
     *
     * @param {Object} settings
     */
    constructor(template, data, settings = {}) {
        this.settings = {
            start: "{{",
            end: "}}",
            path: "[a-z0-9_$][\\.a-z0-9_]*",
            ...settings,
        };
        this.templates = {};
        this.filters = {};
        this.pattern = new RegExp(
            `${this.settings.start}\s*(${this.settings.path})\s*${this.settings.end}`,
            "gi"
        );
        this.init();
        this.create(template, data);
    }

    init() {
        this.addFilter("token", (token, data, tag) => {
            const path = token.split(".");
            let dataLookup = data;

            for (let i = 0; i < path.length; i++) {
                if (
                    !Object.prototype.hasOwnProperty.call(dataLookup, path[i])
                ) {
                    throw new Error(
                        `Tim: '${path[i]}' not found${i ? ` in ${tag}` : ""}`
                    );
                }

                dataLookup = dataLookup[path[i]];

                // Retourne la valeur si on est à la fin du chemin
                if (i === path.length - 1) {
                    return dataLookup;
                }
            }
        });
    }

    create(template, data) {
        // init for potential plugins
        if (!this.initialized) {
            this.initialized = true;
            this.applyFilter("init");
        }
        template = this.applyFilter("templateBefore", template);

        if (!template.includes(this.settings.start)) {
            const templateLookup = this.templatesCache(template);
            if (templateLookup) {
                template = templateLookup;
            }
        }
        template = this.applyFilter("template", template);

        // substitution des tokens in template

        if (template && data !== undefined) {
            template = this.substitute(template, data);
        }

        return this.applyFilter("templateAfter", template);
    }

    /**
     * 
     * @param {*} key 
     * @param {*} value 
     * @returns 
     * @description  
     *  templatesCache("foo"); // get template named "foo"
        templatesCache("foo", "bar"); // set template named "foo" to "bar"
        templatesCache("foo", false); // delete template named "foo"
        templatesCache({foo:"bar", blah:false}); // set multiple templates
        templatesCache(false); // delete all templates
     */
    templatesCache(key, value) {
        if (typeof key === "string") {
            if (value === undefined) {
                return this.templates[key] || "";
            } else if (value === false) {
                delete this.templates[key];
            } else {
                this.templates[key] = value;
            }
        } else if (typeof key === "object" && key !== null) {
            Object.keys(key).forEach((t) => {
                this.templatesCache(t, key[t]);
            });
        } else if (typeof key === "boolean" && !key) {
            this.templates = {};
        }
        return this.templates;
    }

    extend(obj1, obj2) {
        return { ...obj1, ...obj2 };
    }

    sortByPriority(a, b) {
        return a[1] - b[1];
    }

    addFilter(name, fn, priority) {
        if (typeof name !== "string" || typeof fn !== "function") {
            throw new TypeError(
                "Invalid arguments: 'filterName' must be a string and 'fn' must be a function."
            );
        }

        this.filters[name] = this.filters[name] || [];

        const fns = this.filters[name];
        fns.push([fn, priority || 0]);
        fns.sort(this.sortByPriority);
        return fn;
    }

    applyFilter(name, payload, ...args) {
        const fns = this.filters[name];
        if (!fns) return payload;

        for (let i = 0; i < fns.length; i++) {
            const [fn] = fns[i];
            const substituted = fn(payload, ...args);

            if (payload !== undefined && substituted !== undefined) {
                // undef var
                payload = substituted;
            }

            if (substituted == null) {
                payload = "";
            }

            if (this.stopThisFilter) {
                this.stopThisFilter = false;
                break;
            }
        }
        return payload;
    }

    filter(name, payload) {
        return (typeof payload === "function" ? addFilter : applyFilder).apply(
            null,
            arguments
        );
    }
    stop() {
        this.stopThisFilter = true;
    }

    substitute(template, data) {
        let match;

        while ((match = this.pattern.exec(template)) !== null) {
            const token = match[1];
            let substituted = this.applyFilter("token", token, data, template);

            const startPos = match.index;
            const endPos = this.pattern.lastIndex;
            const templateStart = template.slice(0, startPos);
            let templateEnd = template.slice(endPos);

            // Si la substitution est une fonction, on appelle et utilise la valeur retournée
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
                const closeToken = `${this.settings.start}/${token}${this.settings.end}`;
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
                                this.pattern.lastIndex = 0;

                                // Autoriser {{_key}} et {{_value}} dans les templates
                                const loopData = this.applyFilter(
                                    "loopData",
                                    extend(
                                        {
                                            _key: key,
                                            _value: substituted[key],
                                        },
                                        substituted[key]
                                    ),
                                    innerTemplate,
                                    token
                                );

                                const loop = this.create(
                                    innerTemplate,
                                    loopData
                                );
                                subTemplate += this.applyFilter(
                                    "loop",
                                    loop,
                                    token,
                                    loopData
                                );
                            }
                        }
                        subTemplate = this.applyFilter(
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

            this.pattern.lastIndex = 0;
        }

        return template;
    }
}

export default Potion;
