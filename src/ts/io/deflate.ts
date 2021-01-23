/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export const DEFLATE_STORE = 0;

export function zlib_raw_deflate(xs: Uint8Array, deflate_type: number) {
    switch (deflate_type) {
        case DEFLATE_STORE: break;
        default: throw new Error('unknown DEFLATE type');
    }
    return deflate(xs);
}

const MAX_BLOCK_SIZE = 32*1024
function deflate(xs: Uint8Array) {
    const n = Math.ceil(xs.length / MAX_BLOCK_SIZE);
    const overhead = 5*n;

    const out = new Uint8Array(xs.length+overhead);

    let roffs = 0;
    let woffs = 0;
    for (let i = 0; i < n; i++) {
        let size = xs.length - roffs;
        size = size > MAX_BLOCK_SIZE ? MAX_BLOCK_SIZE : size;
        // console.log(`deflating. roffs: ${roffs}, woffs: ${woffs}, size: ${size}`);

        const is_final = i+1 === n;

        out[woffs] = is_final ? 1 : 0;
        woffs += 1;

        out[woffs+0] = size & 0xFF;
        out[woffs+1] = size >> 8;
        out[woffs+2] = ~out[woffs+0];
        out[woffs+3] = ~out[woffs+1];
        woffs += 4;

        out.set(xs.slice(roffs, roffs+size), woffs);
        woffs += size;
        roffs += size;
    }
    return out;
}