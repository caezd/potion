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
    // floor
    test("Potion applique le filtre floor", () => {
        expect(potion("[ceil | floor]", dataNumber)).toBe("1");
    });
    // devided_by
    test("Potion applique le filtre devided_by", () => {
        expect(potion("[at_most | divided_by: 2]", dataNumber)).toBe("50");
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
};

describe("Filtres pour array", () => {
    // compact
    test("Potion applique le filtre compact", () => {
        expect(potion("[array | compact][_value][/array]", dataArray)).toEqual(
            "HelloWorld"
        );
    });
    // first
    test("Potion applique le filtre first", () => {
        expect(potion("[array | first]", dataArray)).toBe("Hello");
    });
    // last
    test("Potion applique le filtre last", () => {
        expect(potion("[join | last]", dataArray)).toBe("World");
    });
    // join
    test("Potion applique le filtre join", () => {
        expect(potion(`[join | join: ","]`, dataArray)).toBe("Hello,World");
    });
    // map
    test("Potion applique le filtre map", () => {
        expect(potion(`[join | map: "length"]`, dataArray)).toBe("5,5");
    });
});
