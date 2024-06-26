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
    public name: string;

    constructor(xs: A[], name?: string) {
        this.xs = xs;
        this.index = 0;
        this.name = name || '';
    }

    eof(): boolean {
        return this.index >= this.xs.length;
    }

    peek(): A {
        return this.xs[this.index];
    }

    next(): A {
        return this.xs[this.index++];
    }
}