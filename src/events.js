/**
 * Potion — Event directives binder.
 *
 * Supporte les directives d’événements sous forme `@event.mod1.mod2="handler(...)"`.
 * Exemples :
 * - @click.stop="open"
 * - @submit.prevent="save"
 * - @keyup.enter="send"
 * - @click.right.prevent="menu($event)"
 *
 * Notes :
 * - Si tu écris `@click="fn"`, Potion appelle `fn($event)`.
 * - Si tu écris `@click="fn(a, b)"`, Potion appelle `fn(a, b)` (l’event n’est passé que si tu utilises `$event`).
 *
 * @module events
 */

import { localContextsMap } from "./parser.js";

/**
 * Données racines accessibles au template (data store) + contexte local.
 * @typedef {Record<string, any>} PotionData
 */

/**
 * Contexte d’appel injecté au callback (fusion data + localData).
 * `$event` est ajouté au moment de l’appel.
 * @typedef {PotionData & { $event?: Event }} PotionContext
 */

/**
 * Nom d’un event DOM (Potion supporte tout string, mais on documente les plus courants).
 * @typedef {string} PotionEventType
 */

/**
 * Modificateurs supportés (doc + options DOM).
 * @typedef {'stop'|'prevent'|'self'|'once'|'capture'|'passive'|'stopImmediate'
 * |'enter'|'tab'|'delete'|'esc'|'space'|'up'|'down'|'left'|'right'|'middle'} PotionModifier
 */

/**
 * Map interne (non standard) utilisée pour éviter de rebinder plusieurs fois.
 * @typedef {Record<string, (ev: Event) => void>} BoundEventsMap
 */

/**
 * Récupère le contexte local le plus proche (via `data-potion-key`) en remontant le DOM.
 *
 * @param {Element} element - Élément depuis lequel on cherche le contexte local.
 * @param {PotionData} defaultData - Fallback si aucun contexte local trouvé.
 * @returns {PotionData} Le contexte local ou `defaultData`.
 */
export function getLocalContext(element, defaultData) {
  /** @type {Element|null} */
  let el = element;

  while (el && el !== document.body) {
    const key = el.getAttribute("data-potion-key");
    if (key) {
      const context = localContextsMap.get(key);
      if (context !== undefined) return context;
    }
    el = el.parentElement;
  }

  return defaultData;
}

/**
 * Split d’arguments robuste : gère les virgules dans les strings.
 * Ex: `a, "b,c", 12` => ["a", "b,c", "12"]
 *
 * @param {string} argString
 * @returns {string[]}
 */
function parseArgsList(argString) {
  const s = (argString ?? "").trim();
  if (!s) return [];

  /** @type {string[]} */
  const args = [];

  // 1) "..." 2) '...' 3) token jusqu’à la virgule
  const regex = /(?:"([^"]*)"|'([^']*)'|([^,]+))(?:,\s*)?/g;

  /** @type {RegExpExecArray|null} */
  let m;
  while ((m = regex.exec(s)) !== null) {
    if (m[1] !== undefined) args.push(m[1]);
    else if (m[2] !== undefined) args.push(m[2]);
    else args.push(m[3].trim());
  }

  return args;
}

/**
 * Récupère une valeur via un chemin "a.b.c".
 *
 * @param {any} obj
 * @param {string} path
 * @returns {any}
 */
function getByPath(obj, path) {
  const parts = path.split(".");
  let cur = obj;

  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }

  return cur;
}

/**
 * Parse un argument (token) d’événement.
 * Supporte :
 * - `$event`
 * - booleans: true/false
 * - numbers
 * - variables : `id` ou `user.name`
 * - fallback string (si introuvable)
 *
 * @param {string} arg
 * @param {PotionContext} ctx
 * @param {Event} event
 * @returns {any}
 */
export function parseEventArg(arg, ctx, event) {
  const a = String(arg).trim();

  if (a === "$event") return event;
  if (a === "true") return true;
  if (a === "false") return false;

  // number (évite le piège isNaN("") => false)
  if (a !== "" && !Number.isNaN(Number(a))) return Number(a);

  // variable / path
  const val = a.includes(".") ? getByPath(ctx, a) : ctx[a];

  // IMPORTANT: pas de `||` (0/false/"" doivent rester valides)
  return val !== undefined ? val : a;
}

/**
 * Tests de modificateurs clavier.
 * @type {Record<string, (e: KeyboardEvent) => boolean>}
 */
const KEY_MODS = {
  enter: (e) => e.key === "Enter",
  tab: (e) => e.key === "Tab",
  delete: (e) => e.key === "Backspace" || e.key === "Delete",
  esc: (e) => e.key === "Escape" || e.key === "Esc",
  space: (e) => e.key === " " || e.key === "Spacebar" || e.key === "Space",
  up: (e) => e.key === "ArrowUp",
  down: (e) => e.key === "ArrowDown",
  left: (e) => e.key === "ArrowLeft",
  right: (e) => e.key === "ArrowRight",
};

/**
 * Détermine si on doit appliquer une garde clavier et si elle passe.
 *
 * @param {PotionEventType} rawEventType
 * @param {PotionModifier[]} modifiers
 * @param {Event} event
 * @returns {boolean}
 */
function keyboardGuardPasses(rawEventType, modifiers, event) {
  if (rawEventType !== "keyup" && rawEventType !== "keydown") return true;

  const keys = Object.keys(KEY_MODS).filter((k) =>
    modifiers.includes(/** @type {PotionModifier} */ (k)),
  );
  if (keys.length === 0) return true;

  const e = /** @type {KeyboardEvent} */ (event);
  return keys.some((k) => KEY_MODS[k](e));
}

/**
 * Normalise l’event à écouter selon les modificateurs souris.
 * - @click.right => contextmenu
 * - @click.middle => auxclick
 *
 * @param {PotionEventType} eventType
 * @param {PotionModifier[]} modifiers
 * @returns {PotionEventType}
 */
function normalizeMouseEventType(eventType, modifiers) {
  if (eventType === "click" && modifiers.includes("right"))
    return "contextmenu";
  if (eventType === "click" && modifiers.includes("middle")) return "auxclick";
  return eventType;
}

/**
 * Vérifie les modificateurs souris (.left/.right/.middle) si présents.
 *
 * @param {PotionModifier[]} modifiers
 * @param {Event} event
 * @returns {boolean}
 */
function mouseGuardPasses(modifiers, event) {
  // pas un MouseEvent => ignore
  if (!event || typeof (/** @type {any} */ (event).button) !== "number")
    return true;

  const wantsLeft = modifiers.includes("left");
  const wantsRight = modifiers.includes("right");
  const wantsMiddle = modifiers.includes("middle");

  if (!wantsLeft && !wantsRight && !wantsMiddle) return true;

  const e = /** @type {MouseEvent} */ (event);

  const ok =
    (wantsLeft && e.button === 0) ||
    (wantsMiddle && e.button === 1) ||
    (wantsRight && e.button === 2);

  return ok;
}

/**
 * Bind toutes les directives `@...` trouvées sur l’élément.
 *
 * Convention d’appel :
 * - @click="fn" => fn($event)
 * - @click="fn(a,b)" => fn(a,b) (event seulement si `$event` est fourni)
 *
 * @param {Element} element
 * @param {PotionData} data
 * @returns {void}
 */
export function bindEvents(element, data) {
  [...element.attributes]
    .filter((attr) => attr.name.startsWith("@"))
    .forEach((attr) => {
      const parts = attr.name.slice(1).split(".");
      const rawEventType = /** @type {PotionEventType} */ (parts[0]);
      const modifiers = /** @type {PotionModifier[]} */ (parts.slice(1));

      const eventType = normalizeMouseEventType(rawEventType, modifiers);

      // autorise foo, foo.bar, $foo
      const regex = /^([\w$.]+)(?:\((.*)\))?$/;
      const match = attr.value.match(regex);

      if (!match) {
        console.warn(
          "Potion: impossible de parser l'expression de l'événement:",
          attr.value,
        );
        return;
      }

      const fnName = match[1];
      const hasParens = match[2] !== undefined;
      const argsStr = match[2] || "";

      const localData = getLocalContext(element, data);
      const ctx = /** @type {PotionContext} */ ({ ...data, ...localData });

      // Résolution fonction : priorise localData, puis data. Support "a.b.c"
      const localFn = fnName.includes(".")
        ? getByPath(localData, fnName)
        : localData[fnName];
      const rootFn = fnName.includes(".")
        ? getByPath(data, fnName)
        : data[fnName];
      const callback =
        typeof localFn === "function"
          ? localFn
          : typeof rootFn === "function"
            ? rootFn
            : null;

      if (typeof callback !== "function") {
        console.warn(
          `Potion: function '${fnName}' not found in local context or data.`,
        );
        element.removeAttribute(attr.name);
        return;
      }

      // remove previous
      /** @type {any} */ (element).removeEventListener(
        eventType,
        /** @type {any} */ (element)._boundEvents?.[eventType],
      );

      /** @type {(event: Event) => void} */
      const handler = (event) => {
        // guards
        if (modifiers.includes("self") && event.target !== event.currentTarget)
          return;
        if (!keyboardGuardPasses(rawEventType, modifiers, event)) return;
        if (!mouseGuardPasses(modifiers, event)) return;

        // side effects
        if (modifiers.includes("prevent")) event.preventDefault();
        if (modifiers.includes("stop")) event.stopPropagation();
        if (
          modifiers.includes("stopImmediate") &&
          event.stopImmediatePropagation
        )
          event.stopImmediatePropagation();

        const callCtx = /** @type {PotionContext} */ ({
          ...ctx,
          $event: event,
        });

        // @click="fn" => fn($event)
        if (!hasParens) {
          callback.call(callCtx, event);
          return;
        }

        // @click="fn(a,b)" => fn(a,b)
        const rawArgs = parseArgsList(argsStr);
        const resolvedArgs = rawArgs.map((a) =>
          parseEventArg(a, callCtx, event),
        );
        callback.call(callCtx, ...resolvedArgs);
      };

      // store handler
      /** @type {any} */ (element)._boundEvents =
        /** @type {BoundEventsMap} */ ({
          .../** @type {any} */ ((element)._boundEvents || {}),
          [eventType]: handler,
        });

      /** @type {AddEventListenerOptions} */
      const options = {};
      if (modifiers.includes("capture")) options.capture = true;
      if (modifiers.includes("once")) options.once = true;
      if (modifiers.includes("passive")) options.passive = true;

      element.addEventListener(eventType, handler, options);
      element.removeAttribute(attr.name);
    });
}
