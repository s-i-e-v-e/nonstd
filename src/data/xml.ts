/*
 * Copyright (c) 2021 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {CharacterStream} from "./cs.ts";

type Attribute = string[];
type Node = string|Element;

export class Element {
    readonly name: string;
    readonly attrs: Attribute[];
    readonly nodes: Node[];

    constructor(name: string, attrs: Attribute[], nodes: Node[]) {
        this.name = name;
        this.attrs = attrs;
        this.nodes = nodes;
    }

    e(n: string): Element {
      return this.es(n)[0];
    }

    es(n: string): Element[] {
        return this.nodes.map(y => y as Element).filter(y => y.name && y.name === n);
    }

    a(a: string): string {
        return this.attrs
            .filter(xs => xs[0] === a)[0][1];
    }
}

export class Xml {
    private readonly cs: CharacterStream;

    constructor(xs: string) {
        this.cs = new CharacterStream(xs);
    }

    normalize(x: string): string {
        x = x.replace('&lt;', '<');
        x = x.replace('&gt;', '>');
        return x;
    }

    parse_text(): string {
        const xs = [];
        for (; ;) {
            const c = this.cs.peek();
            if (c === '<') break;
            this.error_on_eof(c);
            xs.push(this.cs.next());
        }
        return this.normalize(xs.join(''));
    }

    parse_name(): string {
        this.cs.skip_ws();
        const xs = [];
        for (; ;) {
            const c = this.cs.peek();
            if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '=' || c === '<' || c === '>' || c === '!' || c === '?') break;
            this.error_on_eof(c);
            xs.push(this.cs.next());
        }
        return xs.join('');
    }

    parse_value(): string {
        const xs = [];
        for (; ;) {
            const c = this.cs.peek();
            if (c === '"') break;
            this.error_on_eof(c);
            xs.push(this.cs.next());
        }
        return this.normalize(xs.join(''));
    }

    error_on_eof(c?: string) {
        if (!c) throw new Error();
    }

    expect_t(c: string) {
        if (this.cs.next() !== c) throw new Error();
    }

    parse_attr(): string[] {
        const name = this.parse_name();
        this.cs.skip_ws();
        this.expect_t('=');
        this.expect_t('"');
        const value = this.parse_value();
        this.expect_t('"');
        return [name, value];
    }

    parse_el(): Element {
        const c = this.cs.peek();

        if (c === '?' || c === '!') {
            for (; ;) {
                const c = this.cs.next();
                if (!c) break;
                if (c === '>') break;
            }
            return new Element(c, [], []);
        } else {
            const name = this.parse_name();
            const el = new Element(name, [], []);

            // parse attrs
            for (; ;) {
                if (this.cs.next() === '>') break;
                const [k, v] = this.parse_attr();
                el.attrs.push([k, v]);
            }

            for (; ;) {
                this.cs.skip_ws();
                if (this.cs.peek() !== '<') el.nodes.push(this.parse_text());
                if (this.cs.peek() === '<') {
                    this.cs.next();
                    if (this.cs.peek() === '/') {
                        // parse end
                        this.expect_t('/');
                        const n = this.parse_name();
                        if (name !== n) throw new Error();
                        this.expect_t('>');
                        break;
                    } else {
                        el.nodes.push(this.parse_el());
                    }
                }
            }
            return el;
        }
    }

    parse(): Element {
        const ys = [];
        for (;!this.cs.eof();) {
            this.cs.skip_ws();
            this.expect_t('<');
            ys.push(this.parse_el());
            this.cs.skip_ws();
        }
        return new Element('root', [], ys);
    }
}