export function createElement(templateName, data) {
    // This function should create a virtual DOM representation
    // For simplicity, let's assume it returns an object structure
    return {
        tagName: templateName,
        attributes: {}, // Add attributes if needed
        children: Object.keys(data).map((key) => ({
            tagName: "div",
            attributes: { id: key },
            children: [data[key]],
        })),
    };
}

export function diff(oldVirtualDom, newVirtualDom) {
    const patches = [];

    function walk(oldNode, newNode, index = 0) {
        if (!newNode) {
            patches.push({ type: "REMOVE", index });
        } else if (!oldNode) {
            patches.push({ type: "ADD", newNode, index });
        } else if (oldNode.tagName !== newNode.tagName) {
            patches.push({ type: "REPLACE", newNode, index });
        } else if (typeof oldNode === "string" && oldNode !== newNode) {
            patches.push({ type: "TEXT", newNode, index });
        } else {
            const attrPatches = diffAttributes(
                oldNode.attributes,
                newNode.attributes
            );
            if (Object.keys(attrPatches).length > 0) {
                patches.push({ type: "ATTR", attrPatches, index });
            }
            diffChildren(oldNode.children, newNode.children, patches, index);
        }
    }

    function diffAttributes(oldAttrs, newAttrs) {
        const patches = {};
        for (const key in oldAttrs) {
            if (oldAttrs[key] !== newAttrs[key]) {
                patches[key] = newAttrs[key];
            }
        }
        for (const key in newAttrs) {
            if (!oldAttrs.hasOwnProperty(key)) {
                patches[key] = newAttrs[key];
            }
        }
        return patches;
    }

    function diffChildren(oldChildren, newChildren, patches, index) {
        const max = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < max; i++) {
            walk(oldChildren[i], newChildren[i], index + i);
        }
    }

    walk(oldVirtualDom, newVirtualDom);
    return patches;
}

export function updateElement(rootElement, oldVirtualDom, newVirtualDom) {
    const patches = diff(oldVirtualDom, newVirtualDom);
    applyPatches(rootElement, patches);
}

function applyPatches(rootElement, patches) {
    patches.forEach((patch) => {
        const { type, index, newNode, attrPatches } = patch;
        const element = rootElement.childNodes[index];

        switch (type) {
            case "REMOVE":
                rootElement.removeChild(element);
                break;
            case "ADD":
                rootElement.appendChild(createRealElement(newNode));
                break;
            case "REPLACE":
                rootElement.replaceChild(createRealElement(newNode), element);
                break;
            case "TEXT":
                element.textContent = newNode;
                break;
            case "ATTR":
                for (const key in attrPatches) {
                    element.setAttribute(key, attrPatches[key]);
                }
                break;
        }
    });
}

function createRealElement(vNode) {
    if (typeof vNode === "string") {
        return document.createTextNode(vNode);
    }
    const element = document.createElement(vNode.tagName);
    for (const key in vNode.attributes) {
        element.setAttribute(key, vNode.attributes[key]);
    }
    vNode.children.forEach((child) => {
        element.appendChild(createRealElement(child));
    });
    return element;
}
