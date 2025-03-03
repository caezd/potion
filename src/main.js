import { addFilter, applyFilter } from "./filters.js";
import { isValidHTMLElement } from "./utils.js";
import { extendStore } from "./store.js";
import { substitute } from "./parser.js";
import { bindEvents } from "./events.js";
import { updateDOM, registerRefs } from "./dom.js";
import { deepProxy } from "./reactivity.js";

let templates = {};
let initialized = false;

const defaultSettings = {
    start: "[",
    end: "]",
    path: "[^\\]]+",
    type: "template/potion",
    attr: "data-name",
    tag: "div",
    class: "",
};

let settings = { ...defaultSettings };

if (typeof window !== "undefined") {
    // scan le dom pour les templates de type template/potion
    document
        .querySelectorAll(`template[type="${settings.type}"]`)
        .forEach((el) => {
            const templateName = el.getAttribute(settings.attr);
            templates[templateName] = el.innerHTML;
        });
}

/**
 * Rendu de template depuis une chaîne ou un template en cache.
 *
 * @param {string} template - La chaîne du template ou le templateName en cache.
 * @param {Object} data - Les données pour la substitution.
 * @returns {string} Le template rendu.
 */
function Potion(template, data) {
    // Injecter $store dans les données
    data = extendStore(data);
    if (!initialized) {
        initialized = true;
        applyFilter("init", template, data);
    }
    template = applyFilter("templateBefore", template, data);
    if (!template.includes(settings.start)) {
        template = templates[template] || template;
    }
    template = applyFilter("template", template, data);
    if (template && data !== undefined) {
        template = substitute(template, data, settings);
    }
    return applyFilter("templateAfter", template, data);
}

/**
 * Crée un conteneur à partir d'un template HTML présent dans le DOM.
 *
 * @param {HTMLTemplateElement} templateElement - L'élément template.
 * @param {Object} data - Les données pour le rendu.
 * @returns {Element} Le conteneur créé.
 */
function createContainerFromTemplate(templateElement, data, customSettings) {
    customSettings = { ...settings, ...customSettings };

    // Injecter $store dans les données
    data = extendStore(data);
    const renderedHTML = Potion(
        templateElement.innerHTML,
        data,
        customSettings
    );
    let container;

    if (customSettings.tag && isValidHTMLElement(customSettings.tag)) {
        container = document.createElement(customSettings.tag);
    } else {
        container = document.createElement(settings.tag);
    }
    container.innerHTML = renderedHTML;

    [...templateElement.attributes].forEach((attr) => {
        if (attr.name !== "type") {
            container.setAttribute(attr.name, attr.value);
        }
    });

    if (customSettings.class) {
        container.classList.add(...customSettings.class.split(" "));
    }

    data.$root = container;

    registerRefs(container, data);

    bindEvents(container, data);
    container.querySelectorAll("*").forEach((child) => bindEvents(child, data));

    templateElement.parentNode.replaceChild(container, templateElement);
    return container;
}

/**
 * Rendu synchrone avec réactivité.
 *
 * @param {string} templateName - Le nom du template.
 * @param {Object} data - Les données.
 * @returns {Object} L'objet réactif.
 */
function renderSync(templateName, data, customSettings) {
    const templateElement = document.querySelector(
        `template[data-name='${templateName}']`
    );
    if (!templateElement) {
        throw new Error(
            `Potion: template with name '${templateName}' not found`
        );
    }

    // Injecter $store dans les données
    data = extendStore(data);

    const originalTemplateContent = templateElement.innerHTML;

    // Déclare une fonction mutable pour onChange
    let onChangeCallback = () => {};

    // Crée le proxy avec un callback qui délègue à onChangeCallback
    const proxy = deepProxy(data, () => {
        onChangeCallback();
    });

    // Crée le container en passant le proxy (qui sera utilisé pour le rendu initial)
    const containerElement = createContainerFromTemplate(
        templateElement,
        proxy,
        customSettings
    );

    // Maintenant, on définit onChangeCallback pour utiliser containerElement
    onChangeCallback = () => {
        const updatedHTML = Potion(originalTemplateContent, proxy);
        updateDOM(containerElement, updatedHTML);
        bindEvents(containerElement, proxy);
        containerElement
            .querySelectorAll("*")
            .forEach((child) => bindEvents(child, proxy));
    };

    return proxy;
}

/**
 * La fonction principale 'potion' qui effectue un rendu ponctuel.
 *
 * @param {string} template - Le template sous forme de chaîne.
 * @param {Object} data - Les données pour le rendu.
 * @returns {string} Le template rendu.
 */
function potion(template, data) {
    return Potion(template, data);
}

potion.sync = renderSync;
potion.render = function (templateName, data, customSettings) {
    const templateElement = document.querySelector(
        `template[data-name='${templateName}']`
    );
    if (!templateElement)
        throw new Error(
            `Potion: template with name '${templateName}' not found`
        );
    return createContainerFromTemplate(templateElement, data, customSettings);
};

potion.addFilter = addFilter;
potion.applyFilter = applyFilter;

export default potion;
