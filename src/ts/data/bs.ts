/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface BitStreamEosError {
    name: string;
    message: string;
    stack?: string;
    bits: number,
    bit_count: number,
}

function BitStreamEosError() {
    const e = new Error();
    return {
        name: 'BitStreamEosError',
        message: 'BitStream: EOS',
        stack: e.stack,
        bits: 0,
        bit_count: 0,
    };
}

export function is_bs_eos(e: Error) {
    return e.name === 'BitStreamEosError';
}

export class BitStream {
    private index: number;
    private bits: number;
    private xs: Uint8Array;

    constructor(xs?: Uint8Array) {
        this.index = 0;
        this.bits = 0;
        this.xs = xs || new Uint8Array(0);
    }

    set(bs: BitStream) {
        //if (!bs.index) throw new Error();
        this.index = bs.index;
        this.bits = bs.bits;
        this.xs = bs.xs;
    }

    clone() {
        const bs = new BitStream(this.xs);
        bs.index = this.index;
        bs.bits = this.bits;
        return bs;
    }

    eos() {
        return this.index >= this.xs.byteLength;
    }

    pos() {
        return this.index;
    }

    slice(start: number, end: number) {
        return this.xs.slice(start, end);
    }

    skip_byte() {
        if (this.bits > 0) {
            this.bits = 0;
            this.index++;
        }
    }

    resize_adhoc() {
        if (this.index < this.xs.byteLength) return;
        const n = Math.ceil(this.index || 1 / 4096)*4096; // round to next 4K
        const xs = new Uint8Array(n);
        xs.set(this.xs, 0);
        this.xs = xs;
    }

    resize_exact(p: Uint8Array) {
        const n = this.index + p.byteLength;
        if (n < this.xs.byteLength) return;
        const xs = new Uint8Array(n);
        xs.set(this.xs, 0);
        this.xs = xs;
    }

    write_byte(b: number) {
        this.resize_adhoc();
        this.xs[this.index] = b;
        this.index++;
    }

    update(p: Uint8Array) {
        const bs = new BitStream();
        bs.index = this.index;
        bs.bits = this.bits;
        bs.xs = new Uint8Array(this.xs.byteLength + p.byteLength);
        bs.xs.set(this.xs, 0);
        bs.xs.set(p, this.xs.byteLength);
        return bs;
    }

    write_bytes(p: Uint8Array) {
        this.resize_exact(p);
        this.xs.set(p, this.index);
        this.index += p.byteLength;
    }

    next_bit() {
        if (this.eos()) throw BitStreamEosError();
        this.bits = this.bits || 8;
        const b = (this.xs[this.index] >> (8-this.bits)) & 1;
        this.bits--;
        this.index += this.bits ? 0 : 1;
        return b;
    }

    // lsb...msb
    next_bits_lm(n: number) {
        if (n === 0) throw new Error();
        let b = this.next_bit();
        for (let i = 1; i < n; i++) {
            b = b << 1 | this.next_bit();
        }
        return b;
    }

    // msb...lsb
    next_bits_ml(n: number) {
        if (n === 0) throw new Error();
        let b = this.next_bit();
        for (let i = 1; i < n; i++) {
            b = b | (this.next_bit() << i);
        }
        return b;
    }

    next_u16_ml() {
        const a = this.next_bits_ml(8);
        const b = this.next_bits_ml(8);
        return a | (b << 8);
    }

    bytes_to_index() {
        if (!this.index) throw new Error();
        const xs = this.xs.slice(0, this.index);
        if (xs.byteLength === 0) throw new Error();
        return xs;
    }

    read_bytes(n: number) {
        const xs = this.xs.slice(this.index, this.index+n);
        this.index += xs.length;
        if (xs.length !== n) throw BitStreamEosError();
        return xs;
    }
}