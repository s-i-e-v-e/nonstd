/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {CharacterStream} from "../data/cs.ts";
import {Xml} from "../data/xml.ts";
import {zlib_raw_deflate} from "../io/deflate.ts";
import {
    zlib_raw_inflate,
    zlib_raw_inflate_init,
    zlib_raw_inflate_process,
    zlib_raw_inflate_term
} from "../io/inflate.ts";

function main(args: string[]) {
    test_cs();
    test_xml();

    test_deflate();
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

function test_deflate() {
    const MAX_BLOCK_SIZE = 32*1024
    const a = new Array(MAX_BLOCK_SIZE).fill(0x61);
    const b = new Array(MAX_BLOCK_SIZE).fill(0x62);
    const c = new Array(MAX_BLOCK_SIZE).fill(0x63);

    const xs = new Uint8Array([].concat(...a).concat(...b).concat(...c));
    const ys = zlib_raw_deflate(xs, 0);
    assert_eq(0x61,ys[MAX_BLOCK_SIZE*0+5]);
    assert_eq(0x61,ys[MAX_BLOCK_SIZE*1-1]);
    assert_eq(0x62,ys[MAX_BLOCK_SIZE*1+10]);
    assert_eq(0x62,ys[MAX_BLOCK_SIZE*2-1]);
    assert_eq(0x63,ys[MAX_BLOCK_SIZE*2+15]);
    assert_eq(0x63,ys[MAX_BLOCK_SIZE*3-1]);
    //Deno.writeFileSync('00.bin', ys);

    // const zs = test_zlib_raw_inflate(ys);
    const zs = zlib_raw_inflate(ys);
    assert_eq(xs.byteLength, zs.byteLength);
    for (let i = 0; i < xs.byteLength; i++) {
        assert_eq(xs[i], zs[i]);
    }
}

function test_zlib_raw_inflate(p: Uint8Array) {
    const is = zlib_raw_inflate_init();
    const ns = Math.floor(p.byteLength / 2);
    let a = 0;
    for (;a < p.byteLength;) {
        let b = a+ns;
        b = b > p.byteLength ? p.byteLength : b;
        const q = p.subarray(a, b);
        zlib_raw_inflate_process(is, q);
        a += b-a;
    }
    return zlib_raw_inflate_term(is);
}

if (import.meta.main) main(Deno.args);