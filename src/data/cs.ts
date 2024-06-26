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
    public name: string;

    constructor(xs: string, name?: string) {
        this.xs = xs;
        this.index = 0;
        this.name = name || '';
    }

    eof(): boolean {
        return this.index >= this.xs.length;
    }

    peek(): string {
        return this.xs[this.index];
    }

    next(): string {
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

    get_index(): number {
        return this.index;
    }

    get_line_and_character(n: number): [number, number] {
        let line = 1;
        let character = 0;
        for (let i = 0; i < this.xs.length; i++) {
            if (i === n) break;
            character++;

            if (this.xs[i] === '\n') {
                line++;
                character = 0;
            }
        }
        return [line, character];
    }

    substring(a: number, b: number): string {
        return this.xs.substring(a, b);
    }
}