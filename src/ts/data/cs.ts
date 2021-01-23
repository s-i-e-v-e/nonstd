/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export class CharacterStream {
    private readonly xs: string;
    private index: number;

    constructor(xs: string) {
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

    skip_ws() {
        let done = false
        for (;!done;) {
            const c = this.peek();
            switch (c) {
                case ' ':
                case '\t':
                case '\r':
                case '\n': {
                    this.next();
                    break;
                }
                default: {
                    done = true;
                    break;
                }
            }
        }
    }
}