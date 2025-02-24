import { addFilter, applyFilter } from "./filters.js";
import { isValidHTMLElement } from "./utils.js";
import { substitute } from "./parser.js";
import { bindEvents } from "./events.js";
import { updateDOM } from "./dom.js";
import { deepProxy } from "./reactivity.js";

let templates = {};
let initialized = false;

const defaultSettings = {
    start: "[",
    end: "]",
    path: "[a-z0-9_$][\\.a-z0-9_]*",
    type: "template/potion",
    attr: "data-name",
    tag: "div",
    class: "",
};

let settings = { ...defaultSettings };

/**
 * Rendu de template depuis une chaîne.
 *
 * @param {string} template - La chaîne du template.
 * @param {Object} data - Les données pour la substitution.
 * @returns {string} Le template rendu.
 */
function Potion(template, data) {
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
 * @param {string} templateName - Le nom du template.
 * @param {Object} data - Les données pour le rendu.
 * @returns {Element} Le conteneur créé.
 */
function createContainerFromTemplate(
    templateElement,
    templateName,
    data,
    customSettings
) {
    const renderedHTML = Potion(
        templateElement.innerHTML,
        data,
        customSettings
    );
    let container;

    if (!isValidHTMLElement(customSettings.tag)) {
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

    if (customSettings && customSettings.class) {
        container.classList.add(customSettings.class);
    }

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
    // Stocker le contenu original du template
    const containerElement = createContainerFromTemplate(
        templateElement,
        templateName,
        data,
        customSettings
    );

    const proxy = deepProxy(data, () => {
        const updatedHTML = Potion(templateElement.innerHTML, data);
        updateDOM(containerElement, updatedHTML);
        bindEvents(containerElement, data);
        containerElement
            .querySelectorAll("*")
            .forEach((child) => bindEvents(child, data));
    });
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
    return createContainerFromTemplate(
        templateElement,
        templateName,
        data,
        customSettings
    );
};

potion.addFilter = addFilter;
potion.applyFilter = applyFilter;

export default potion;
