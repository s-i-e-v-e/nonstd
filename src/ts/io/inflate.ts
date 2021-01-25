/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {BitStream, is_bs_eos} from "../data/bs.ts";

export function zlib_inflate(p: Uint8Array) {
    if (p[0] !== 0x78) throw new Error('ZLIB: invalid header');
    return zlib_raw_inflate(p.subarray(2));
}

export function zlib_inflate_either(p: Uint8Array) {
    p = p[0] === 0x78 ? p.subarray(2) : p;
    return zlib_raw_inflate(p);
}

export function zlib_raw_inflate(p: Uint8Array) {
    const is = zlib_raw_inflate_init();
    zlib_raw_inflate_process(is, p);
    return zlib_raw_inflate_term(is);
}

export interface InflateStream {
    ins: BitStream,
    outs: BitStream,
    tree_alph: HuffmanTree,
    tree_dist_alph: HuffmanTree,
    eos: boolean,
}

export function zlib_raw_inflate_init() {
    return {
        ins: new BitStream(),
        outs: new BitStream(),
        tree_alph: build_fixed_alph(),
        tree_dist_alph: build_fixed_dist_alph(),
        eos: false,
    };
}

export function zlib_raw_inflate_process(is: InflateStream, p: Uint8Array) {
    is.ins = is.ins.update(p);
    for (;;) {
        // save state before processing block
        const ins = is.ins.clone();
        const outs = is.outs.clone();
        try {
            const is_final = process_block(is);
            if (is_final || is.ins.eos()) {
                is.eos = true;
                break;
            }
        }
        catch (e) {
            if (!is_bs_eos(e)) throw e;
            is.ins.set(ins);
            is.outs.set(outs);
            break;
        }
    }
}

export function zlib_raw_inflate_term(is: InflateStream) {
    return is.outs.bytes_to_index();
}

/**
 *  Implements algorithms from RFC1951 (https://www.ietf.org/rfc/rfc1951.html)
 *
 *  If the RFC doesn't make sense, refer to an actual implementation such as
 *  puff (https://github.com/madler/zlib/tree/master/contrib/puff)
 **/
function process_block(is: InflateStream) {
    const bfinal = is.ins.next_bit();
    const btype = is.ins.next_bits_ml(2);
    switch (btype) {
        case 0: decode_stored_block(is); break;
        case 1: decode_fixed_block(is); break;
        case 2: decode_dynamic_block(is); break;
        default: throw Error('unsupported type');
    }
    return bfinal;
}

function decode_stored_block(is: InflateStream) {
    // skip bytes to byte boundary
    is.ins.skip_byte();
    const n = is.ins.next_u16_ml();
    const nn = is.ins.next_u16_ml();
    if (n !== (~nn & 0xFFFF)) throw new Error('INFLATE: invalid bitstream');

    const xs = is.ins.read_bytes(n);
    is.outs.write_bytes(xs);
}

function decode_block(ins: BitStream, outs: BitStream, tree_alph: HuffmanTree, tree_dist_alph: HuffmanTree) {
    while (true) {
        let n = decode(ins, tree_alph);
        if (n < 256) {
            outs.write_byte(n);
        }
        else if (n === 256) {
            break;
        }
        else {
            n -= 257;
            let l = LENGTH_CODE_BASES[n] + (LENGTH_CODE_X_BITS[n] ? ins.next_bits_ml(LENGTH_CODE_X_BITS[n]) : 0);
            n = decode(ins, tree_dist_alph);
            let d = DISTANCE_CODE_BASES[n] + (DISTANCE_CODE_X_BITS[n] ? ins.next_bits_ml(DISTANCE_CODE_X_BITS[n]) : 0);

            for (;l > 0;) {
                let m = outs.pos()-d;
                let n = m+l;
                n = n <= outs.pos()? n : outs.pos();
                const ys = outs.slice(m, n);
                if (m < 0 || n < m || ys.length === 0) throw new Error(`idx: ${outs.pos()}, m: ${m}, n: ${n}`);
                outs.write_bytes(ys);
                l -= ys.length;
                d += ys.length;
            }
        }
    }
}

function decode_fixed_block(is: InflateStream) {
    decode_block(is.ins, is.outs, is.tree_alph, is.tree_dist_alph);
}

function decode_dynamic_block(is: InflateStream) {
    const hlit = is.ins.next_bits_ml(5);
    const hdist = is.ins.next_bits_ml(5);
    const hclen = is.ins.next_bits_ml(4);

    const hlit_a = hlit + 257;
    const hdist_a = hdist + 1;
    const hclen_a = hclen + 4;

    let cl_tree = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15].map(x => make_decode(x, 0));
    for (let i = 0; i < hclen_a; i++) {
        const a = is.ins.next_bits_ml(3);
        cl_tree[i].len = a;
    }
    cl_tree = build_decode_map(cl_tree);

    const build = (tree: HuffmanTree, n_a: number) => {
        for (let i = 0; i < n_a;) {
            let n = decode(is.ins, cl_tree);
            if (n < 16) {
                tree[i].len = n;
                i++;
            }
            else {
                let repeat = 0;
                let len = 0;
                switch (n) {
                    case 16: repeat = 3+is.ins.next_bits_ml(2); len = tree[i-1].len; break;
                    case 17: repeat = 3+is.ins.next_bits_ml(3); break;
                    case 18: repeat = 11+is.ins.next_bits_ml(7); break;
                    default: throw new Error();
                }
                while (repeat > 0) {
                    tree[i].len = len;
                    i++;
                    repeat--;
                }
            }
        }
    }

    let tree_alph = Array.from(Array(hlit_a+1).keys()).map(x => make_decode(x, 0));
    let tree_dist_alph = Array.from(Array(hdist_a+1).keys()).map(x => make_decode(x, 0));

    build(tree_alph, hlit_a);
    build(tree_dist_alph, hdist_a);

    tree_alph = build_decode_map(tree_alph);
    tree_dist_alph = build_decode_map(tree_dist_alph);
    decode_block(is.ins, is.outs, tree_alph, tree_dist_alph);
}

/**
 * Alphabets
 * ---------
 * 0..255 - literals
 * 3..258 - length
 * 1..32768 - distance
 *
 * Literals+lengths combined into single alphabet 0..285
 * 0..255 - as is
 * 256 - end of block
 * 257..285 length base
 *
 * Distance alphabet: 0..29
 * **/
const MAX_BITS = 15;

const LENGTH_CODE_BASES = [
    3, 4, 5, 6, 7, 8, 9, 10,
    11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115,
    131, 163, 195, 227, 258
];

const LENGTH_CODE_X_BITS = [
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4, 4,
    5, 5, 5, 5, 0
];

const DISTANCE_CODE_BASES = [
    1, 2, 3, 4, 5, 7, 9, 13,
    17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073,
    4097, 6145, 8193, 12289, 16385, 24577
];

const DISTANCE_CODE_X_BITS = [
    0, 0, 0, 0, 1, 1, 2, 2,
    3, 3, 4, 4, 5, 5, 6, 6,
    7, 7, 8, 8, 9, 9, 10, 10,
    11, 11, 12, 12, 13, 13
];

interface Decode {
    len: number, // bits
    sym: number,
}

type HuffmanTree = Decode[];

function make_decode(sym: number, len: number): Decode {
    return {len: len, sym: sym};
}

function decode(bs: BitStream, tree: HuffmanTree) {
    let code = 0;
    for (let i = 1; i <= MAX_BITS; i++) {
        code = code << 1 | bs.next_bit();
        const a = tree[code];
        if (a && a.len === i) return a.sym;
    }
    throw new Error();
}

function build_decode_map(tree: HuffmanTree) {
    // sort by bits, then by sym
    tree.sort((a, b) => a.len < b.len ? -1 : a.len > b.len ? 1 : a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0);

    // Count the number of codes for each code length.
    const bl_count = new Array(MAX_BITS+1).fill(0);
    for (const a of tree) {
        bl_count[a.len]++;
    }

    // Find the numerical value of the smallest code for each code length
    const next_code = new Array(MAX_BITS+1).fill(0);
    bl_count[0] = 0;
    for (let len = 1; len <= MAX_BITS; len++) {
        next_code[len] = (next_code[len-1] + bl_count[len-1]) << 1;
    }

    // Assign numerical values to all codes, using consecutive values for all codes of the same length with the base values
    const max_code = tree.length-1;
    const new_tree: HuffmanTree = [];
    for (let n = 0;  n <= max_code; n++) {
        let len = tree[n].len;
        if (len != 0) {
            new_tree[next_code[len]] = tree[n];
            next_code[len]++;
        }
    }

    return new_tree;
}

function build_fixed_alph() {
    const aa = Array.from(Array(288).keys());
    let tree = [
        aa.slice(0, 144).map(x => make_decode(x, 8)),
        aa.slice(144, 256).map(x => make_decode(x, 9)),
        aa.slice(256, 280).map(x => make_decode(x, 7)),
        aa.slice(280, 288).map(x => make_decode(x, 8)),
    ].flat();

    tree = build_decode_map(tree);
    return tree;
}

function build_fixed_dist_alph() {
    let tree = Array.from(Array(32).keys()).map(x => make_decode(x, 5));
    tree = build_decode_map(tree);
    return tree;
}