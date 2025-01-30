function potion(template, data, { start = "[", end = "]" }) {
    if (this instanceof potion) {
        throw new Error("Don't call 'Potion' with new");
    }
    const path = "[a-z0-9_$][\\.a-z0-9_]*"; // e.g., config.person.name
    const pattern = new RegExp(
        `${escapeRegex(start)}\\s*(${path})\\s*${escapeRegex(end)}`,
        "gi"
    );

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Remplace les tokens dans le template

    return template.replace(pattern, function (tag, token) {
        var path = token.split("."),
            len = path.length,
            lookup = data,
            i = 0;

        for (; i < len; i++) {
            lookup = lookup[path[i]];

            // Property not found
            if (lookup === undefined) {
                throw "Potion: '" + path[i] + "' not found in " + tag;
            }

            // Return the required value
            if (i === len - 1) {
                return lookup;
            }
        }
    });
}

export default potion;
