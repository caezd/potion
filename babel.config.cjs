module.exports = {
    presets: [
        // Transforme le code ES en code compatible Node actuel
        ["@babel/preset-env", { targets: { node: "current" } }],
    ],
};
