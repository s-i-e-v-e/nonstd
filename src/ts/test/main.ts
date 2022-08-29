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
    zlib_inflate_either,
    zlib_raw_inflate,
    zlib_raw_inflate_init,
    zlib_raw_inflate_process,
    zlib_raw_inflate_term
} from "../io/inflate.ts";
import {fs_dir_exists, fs_file_exists, fs_ls, fs_parse_path} from "../os/fs.ts";

function main(args: string[]) {
    test_cs();
    test_xml();
    test_fs();

    test_deflate();
    test_inflate_fixed();
    test_inflate_dynamic();
}

function assert(condition: boolean) {
    if (!condition) throw new Error();
}

function assert_eq(expected: any, found: any) {
    let eq = false;
    if (Array.isArray(expected) && Array.isArray(found)) {
        if (expected.length === found.length) {
            eq = true;
            for (let i = 0; i < expected.length; i++) {
                assert_eq(expected[i], found[i]);
            }
        }
    }
    else if (typeof expected === 'object' && typeof found === 'object') {
        eq = true;
        assert_eq(JSON.stringify(expected),JSON.stringify(found));
    }
    else {
        eq = found === expected;
    }
    if (!eq) throw new Error(`Expected: ${expected}, Found: ${found}`);
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

const de = new TextDecoder();
function to_utf8(p: Uint8Array) {
    return de.decode(p);
}

function test_inflate_fixed() {
    const ys0 = zlib_raw_inflate(new Uint8Array([0x33, 0x32, 0x30, 0x55, 0x70, 0xAA, 0x4C, 0x55, 0xE4, 0xE5, 0x02, 0x08]));
    assert_eq('205 Bye!\r\n', to_utf8(ys0));

    const ys1 = zlib_raw_inflate(new Uint8Array([0x73, 0x04, 0x00]));
    assert_eq('A', to_utf8(ys1));

    const ys2 = zlib_raw_inflate(new Uint8Array([0x8B, 0x02, 0x00]));
    assert_eq('Z', to_utf8(ys2));

    const ys3 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x74, 0x72, 0x06, 0x00]));
    assert_eq('ABCABC', to_utf8(ys3));

    const ys4 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x71, 0x8D, 0x77, 0x04, 0x91, 0x00]));
    assert_eq('ABCDE_ABCDE', to_utf8(ys4));

    const ys5 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x71, 0x75, 0x73, 0xF7, 0x88, 0x77, 0x74, 0x72, 0x06, 0x00]));
    assert_eq('ABCDEFGH_ABC', to_utf8(ys5));

    const ys6 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x71, 0x75, 0x73, 0xF7, 0x88, 0x77, 0x74, 0x72, 0x06, 0x61, 0x00]));
    assert_eq('ABCDEFGH_ABC_ABC', to_utf8(ys6));

    const ys7 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x71, 0x75, 0x8C, 0x77, 0x04, 0x51, 0x10, 0x12, 0x00]));
    assert_eq('ABCDEA_ABCDE_ABCDE', to_utf8(ys7));

    const ys8 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x71, 0x75, 0x8C, 0x77, 0x76, 0x89, 0x77, 0x72, 0x06, 0x00]));
    assert_eq('ABCDEA_CD_BC', to_utf8(ys8));

    const ys9 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x74, 0x04, 0x00]));
    assert_eq('AAA', to_utf8(ys9));

    const ys10 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x74, 0x74, 0x04, 0x00]));
    assert_eq('AAAA', to_utf8(ys10));

    const ys11 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x04, 0x02, 0x00]));
    assert_eq('AAAAA', to_utf8(ys11));

    const ys12 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x04, 0x01, 0x00]));
    assert_eq('AAAAAA', to_utf8(ys12));

    const ys13 = zlib_raw_inflate(new Uint8Array([0x73, 0x74, 0x72, 0x76, 0x71, 0x8D, 0x77, 0x44, 0x90, 0x00]));
    assert_eq('ABCDE_ABCDE_ABCDE', to_utf8(ys13));
}

function test_inflate_dynamic() {
    assert_eq(Deno.readTextFileSync('./test/zlib/rfc3977.txt'), to_utf8(zlib_inflate_either(Deno.readFileSync('./test/zlib/rfc3977.txt.raw'))));
    assert_eq(Deno.readTextFileSync('./test/zlib/rfc1951.txt'), to_utf8(zlib_inflate_either(Deno.readFileSync('./test/zlib/rfc1951.txt.raw'))));
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

function test_fs() {
    assert(fs_dir_exists('./test'));
    assert(!fs_dir_exists('./does_not_exist'));

    assert(fs_file_exists('./test/zlib/rfc3977.txt'));
    assert(!fs_file_exists('./does_not_exist'));

    assert_eq(['zlib'], fs_ls('./test').map(x => x.name));

    assert_eq(['rfc1951.txt', 'rfc3977.txt', 'rfc1951.txt.raw', 'rfc3977.txt.raw'].sort(), fs_ls('./test/zlib').map(x => x.name).sort());

    assert_eq({dir: '.', name: 'test', ext: ''}, fs_parse_path('./test'));
}

if (import.meta.main) main(Deno.args);