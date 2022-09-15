/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export class TokenStream<A> {
    private readonly xs: A[];
    private index: number;

    constructor(xs: A[]) {
        this.xs = xs;
        this.index = 0;
    }

    eof() {
        return this.index >= this.xs.length;
    }

    peek() {
        return this.xs[this.index];
    }

    next() {
        return this.xs[this.index++];
    }
}