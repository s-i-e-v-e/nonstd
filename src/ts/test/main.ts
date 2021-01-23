/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {CharacterStream} from "../data/cs.ts";
import {Xml} from "../data/xml.ts";

function main(args: string[]) {
    test_cs();
    test_xml();
}

function assert_eq(expected: any, found: any) {
    if (found !== expected) throw new Error(`Expected: ${expected}, Found: ${found}`);
}

function test_cs() {
    const cs = new CharacterStream("apple banana");
    assert_eq('a', cs.next());
    assert_eq('p', cs.peek());
    cs.next();
    cs.next();
    cs.next();
    cs.next();
    cs.skip_ws();
    assert_eq('b', cs.next());
}

function test_xml() {
    const xml = new Xml('<fruits><f id="1"><name>apple</name></f></fruits>');
    const root = xml.parse();
    assert_eq('1', root.e('fruits').e('f').a('id'));
    assert_eq('apple', root.e('fruits').e('f').e('name').nodes[0]);
}

if (import.meta.main) main(Deno.args);