/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const utf8_en = new TextEncoder();
const utf8_de = new TextDecoder();
export function text_bin_to_utf8(xs: Uint8Array) {
    return utf8_de.decode(xs);
}