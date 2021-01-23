/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {BitStream, is_bs_eos} from "../data/bs.ts";

export function zlib_inflate(p: Uint8Array) {
    if (p[0] !== 0x78) throw new Error('invalid ZLIB header');
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
    eos: boolean,
}

export function zlib_raw_inflate_init() {
    return {
        ins: new BitStream(),
        outs: new BitStream(),
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
                if (!is.ins.eos()) throw new Error('INFLATE: stream has unread bytes');
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

function process_block(is: InflateStream) {
    const bfinal = is.ins.next_bit();
    const btype = is.ins.next_bits_lm(2);
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
    if (n !== (~nn & 0xFFFF)) throw new Error('invalid DEFLATE bitstream');

    const xs = is.ins.read_bytes(n);
    is.outs.write_bytes(xs);
}

function decode_fixed_block(is: InflateStream) {
    throw new Error('not implemented');
}

function decode_dynamic_block(is: InflateStream) {
    throw new Error('not implemented');
}