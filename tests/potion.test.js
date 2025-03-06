beforeAll(() => {
    global._userdata = {
        username: "TestUser",
        session_logged_in: true,
        // ...autres propriétés nécessaires à vos tests
    };
});

import potion from "../src/main";

const dataString = {
    test: "Hello",
    capitalize: "hello",
    trim: " Hello ",
    truncate: "Hello World",
    date: "24-08-2000",
    default: "",
    escape: "<p>Hello</p>",
    encode: "Héllo",
    decode: "H%C3%A9llo",
};

/**
 * Test des filtres string
 */

test("Potion parse bien un token", () => {
    expect(potion("[test]", dataString)).toBe("Hello");
});

describe("Filtres pour string", () => {
    test("Potion applique le filtre uppercase", () => {
        expect(potion("[test | uppercase]", dataString)).toBe("HELLO");
    });

    test("Potion applique le filtre lowercase", () => {
        expect(potion("[test | lowercase]", dataString)).toBe("hello");
    });

    test("Potion applique le filtre capitalize", () => {
        expect(potion("[capitalize | capitalize]", dataString)).toBe("Hello");
    });

    test("Potion applique le filtre trim", () => {
        expect(potion("[trim | trim]", dataString)).toBe("Hello");
    });

    test("Potion applique le filtre truncate", () => {
        expect(potion("[truncate | truncate: 5, '...']", dataString)).toBe(
            "Hello..."
        );
    });

    test("Potion applique le filtre truncate sans ellipsis", () => {
        expect(potion("[truncate | truncate: 5]", dataString)).toBe("Hello");
    });
    // append
    test("Potion applique le filtre append", () => {
        expect(potion("[test | append: ' World']", dataString)).toBe(
            "Hello World"
        );
    });
    //prepend
    test("Potion applique le filtre prepend", () => {
        expect(potion("[test | prepend: 'World ']", dataString)).toBe(
            "World Hello"
        );
    });
    // default
    test("Potion applique le filtre default", () => {
        expect(potion("[test | default: 'World']", dataString)).toBe("Hello");
    });
    test("Potion applique le filtre default avec valeur vide", () => {
        expect(potion("[default | default: 'Hello']", dataString)).toBe(
            "Hello"
        );
    });
    // escape
    test("Potion applique le filtre escape", () => {
        expect(potion("[escape | escape]", dataString)).toBe(
            "&lt;p&gt;Hello&lt;/p&gt;"
        );
    });
    // first
    test("Potion applique le filtre first", () => {
        expect(potion("[test | first]", dataString)).toBe("H");
    });
    // lstrip
    test("Potion applique le filtre lstrip", () => {
        expect(potion("[trim | lstrip]", dataString)).toBe("Hello ");
    });
    // rstrip
    test("Potion applique le filtre rstrip", () => {
        expect(potion("[trim | rstrip]", dataString)).toBe(" Hello");
    });
    // remove
    test("Potion applique le filtre remove", () => {
        expect(potion("[test | remove: 'l']", dataString)).toBe("Heo");
    });
    // remove_first
    test("Potion applique le filtre remove_first", () => {
        expect(potion("[test | remove_first: 'l']", dataString)).toBe("Helo");
    });
    // replace
    test("Potion applique le filtre replace", () => {
        expect(potion("[test | replace: 'l', 'r']", dataString)).toBe("Herro");
    });
    // replace_first
    test("Potion applique le filtre replace_first", () => {
        expect(potion("[test | replace_first: 'l', 'r']", dataString)).toBe(
            "Herlo"
        );
    });
    // reverse
    test("Potion applique le filtre reverse", () => {
        expect(potion("[test | reverse]", dataString)).toBe("olleH");
    });
    // size
    test("Potion applique le filtre size", () => {
        expect(potion("[test | size]", dataString)).toBe("5");
    });
    // slice
    test("Potion applique le filtre slice string", () => {
        expect(potion(`[test | slice: 1, 3]`, dataString)).toBe("el");
    });
    // split
    test("Potion applique le filtre split", () => {
        expect(potion(`[test | split: ""]`, dataString)).toBe(
            ["H", "e", "l", "l", "o"].join(",")
        );
    });
    // strip_html
    test("Potion applique le filtre strip_html", () => {
        expect(potion("[escape | strip_html]", dataString)).toBe("Hello");
    });
    // encode
    test("Potion applique le filtre url_encode", () => {
        expect(potion("[encode | url_encode]", dataString)).toBe("H%C3%A9llo");
    });
    // decode
    test("Potion applique le filtre url_decode", () => {
        expect(potion("[decode | url_decode]", dataString)).toBe("Héllo");
    });
});

/**
 * Test des filtres number
 */
const dataNumber = {
    abs: -1,
    at_most: 100,
    ceil: 1.5,
};
describe("Filtres pour number", () => {
    // abs
    test("Potion applique le filtre abs", () => {
        expect(potion("[abs | abs]", dataNumber)).toBe("1");
    });
    // at_least
    test("Potion applique le filtre at_least", () => {
        expect(potion("[abs | at_least: 2]", dataNumber)).toBe("2");
    });
    // at_most
    test("Potion applique le filtre at_most", () => {
        expect(potion("[at_most | at_most: 50]", dataNumber)).toBe("50");
    });
    // ceil
    test("Potion applique le filtre ceil", () => {
        expect(potion("[ceil | ceil]", dataNumber)).toBe("2");
    });
    // round
    test("Potion applique le filtre round", () => {
        expect(potion("[ceil | round]", dataNumber)).toBe("2");
    });
    // round precision
    test("Potion applique le filtre round avec précision", () => {
        expect(potion("[ceil | round: 1]", dataNumber)).toBe("1.5");
    });
    // floor
    test("Potion applique le filtre floor", () => {
        expect(potion("[ceil | floor]", dataNumber)).toBe("1");
    });
    // devided_by
    test("Potion applique le filtre devided_by", () => {
        expect(potion("[at_most | divided_by: 2]", dataNumber)).toBe("50");
    });
    // minus
    test("Potion applique le filtre minus", () => {
        expect(potion("[abs | minus: 2]", dataNumber)).toBe("-3");
    });
    // modulo
    test("Potion applique le filtre modulo", () => {
        expect(potion("[at_most | modulo: 2]", dataNumber)).toBe("0");
    });
    // plus
    test("Potion applique le filtre plus", () => {
        expect(potion("[abs | plus: 2]", dataNumber)).toBe("1");
    });
    // times
    test("Potion applique le filtre times", () => {
        expect(potion("[abs | times: 2]", dataNumber)).toBe("-2");
    });
});

/**
 * Test des filtres booléens
 */

/**
 * Test des filtres array
 */
const dataArray = {
    array: ["Hello", "World", "", null, undefined],
    join: ["Hello", "World"],
    reverse: ["Hello", "World"],
    sort: [2, 1, 3],
    unique: ["Hello", "Hello", "World"],
};

describe("Filtres pour array", () => {
    // compact
    test("Potion applique le filtre compact", () => {
        expect(potion("[array | compact][_value][/array]", dataArray)).toEqual(
            "HelloWorld"
        );
    });
    // first
    test("Potion applique le filtre first array", () => {
        expect(potion("[array | first]", dataArray)).toBe("Hello");
    });
    test("Potion applique le filtre first string", () => {
        expect(potion("[test | first]", dataString)).toBe("H");
    });
    // last
    test("Potion applique le filtre last array", () => {
        expect(potion("[join | last]", dataArray)).toBe("World");
    });
    test("Potion applique le filtre first string", () => {
        expect(potion("[test | last]", dataString)).toBe("o");
    });
    // join
    test("Potion applique le filtre join", () => {
        expect(potion(`[join | join: ","]`, dataArray)).toBe("Hello,World");
    });
    // map
    test("Potion applique le filtre map", () => {
        expect(potion(`[join | map: "length"]`, dataArray)).toBe("5,5");
    });
    // reverse
    test("Potion applique le filtre reverse", () => {
        expect(potion(`[reverse | reverse]`, dataArray)).toEqual(
            ["World", "Hello"].join(",")
        );
    });
    // size
    test("Potion applique le filtre size array", () => {
        expect(potion(`[array | size]`, dataArray)).toBe("5");
    });
    // slice
    test("Potion applique le filtre slice array", () => {
        expect(potion(`[join | slice: 1, 3]`, dataArray)).toEqual("World");
    });
    // sort
    test("Potion applique le filtre sort", () => {
        expect(potion(`[sort | sort]`, dataArray)).toEqual([1, 2, 3].join(","));
    });
    // unique
    test("Potion applique le filtre unique", () => {
        expect(potion(`[join | unique]`, dataArray)).toEqual(
            ["Hello", "World"].join(",")
        );
    });
});
