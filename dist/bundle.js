'use strict';

const VAL_REGEX = /\{\{(.+?)\}\}/g;

function getValue(vars, key) {
    return key.split(".").reduce((acc, k) => acc[k], vars);
}

function render(fragment, vars) {
    return fragment.replace(VAL_REGEX, function (_, key) {
        var val = getValue(vars, key);

        if (val || val === 0) {
            return val;
        }
        return "";
    });
}

function Potion(template) {
    this.t = template;
}

Potion.prototype.render = function (data) {
    return render(this.t, data);
};

module.exports = Potion;
