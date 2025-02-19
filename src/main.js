import { escapeRegex } from "./utils.js";
import { addFilter, applyFilter } from "./filters.js";
import { substitute, localContextsMap } from "./parser.js";
import { bindEvents, getLocalContext, parseEventArgs } from "./events.js";
import { updateDOM, diffNodes } from "./dom.js";
import { deepProxy } from "./reactivity.js";

let templates = {};
let initialized = false;

const defaultSettings = {
    start: "[",
    end: "]",
    path: "[a-z0-9_$][\\.a-z0-9_]*",
    type: "template/potion",
    attr: "data-name",
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
function createContainerFromTemplate(templateElement, templateName, data) {
    const renderedHTML = Potion(templateElement.innerHTML, data);
    const container = document.createElement("div");
    container.innerHTML = renderedHTML;
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
function renderSync(templateName, data) {
    const templateElement = document.querySelector(
        `template[data-name='${templateName}']`
    );
    if (!templateElement) {
        throw new Error(
            `Potion: template with name '${templateName}' not found`
        );
    }
    // Stocker le contenu original du template
    const originalTemplateContent = templateElement.innerHTML;

    const containerElement = createContainerFromTemplate(
        templateElement,
        templateName,
        data
    );

    let updateScheduled = false;
    function scheduleUpdate() {
        if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(() => {
                updateScheduled = false;
                // Utiliser le contenu original pour recalculer le rendu
                const updatedHTML = Potion(originalTemplateContent, data);
                updateDOM(containerElement, updatedHTML);
                bindEvents(containerElement, data);
                containerElement
                    .querySelectorAll("*")
                    .forEach((child) => bindEvents(child, data));
            });
        }
    }

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
 * Charge les templates depuis le DOM.
 *
 * @returns {Object} Un objet associant noms de templates et leur contenu.
 */
function renderFromDOM() {
    const type = settings.type;
    const attr = settings.attr;
    const elements = document.querySelectorAll(`template[type='${type}']`);
    const templatesInDom = {};
    elements.forEach((elem, i) => {
        const key = elem.getAttribute(attr) || `potion-${i}`;
        templatesInDom[key] = elem.innerHTML;
    });
    templates = templatesInDom;
    return templatesInDom;
}

/**
 * Rendu ponctuel depuis une chaîne de template.
 *
 * @param {string} template - Le template sous forme de chaîne.
 * @param {Object} data - Les données.
 * @returns {string} Le template rendu.
 */
function renderString(template, data) {
    return Potion(template, data);
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

// Ajout de propriétés à la fonction principale pour exposer l'API
potion.sync = renderSync;
potion.render = function (templateName, data) {
    const templateElement = document.querySelector(
        `template[data-name='${templateName}']`
    );
    if (!templateElement)
        throw new Error(
            `Potion: template with name '${templateName}' not found`
        );
    return createContainerFromTemplate(templateElement, templateName, data);
};
potion.renderFromDOM = renderFromDOM;
potion.renderString = renderString;
potion.addFilter = addFilter;
potion.applyFilter = applyFilter;

export default potion;
