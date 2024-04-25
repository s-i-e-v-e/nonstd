/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { toText } from "@std/streams";

export interface Binary {
    mime: string,
    bytes: Uint8Array,
    status: number
}

export type Resource = string|any|Uint8Array;
export type RequestHandler = (method: string, url: string, map: Record<string, Resource>, re: Request) => Promise<Binary>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function get_mime_type(url: string) {
    const ext = url.substring(url.lastIndexOf('.'));
    switch(ext) {
        case '.css': return 'text/css';
        case '.js': return 'application/javascript';
        case '.html': return 'text/html';
        case '.png': return 'image/png';
        case '.jpg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.txt': return 'text/plain';
        case '.json': return 'application/json';
        case '.ico': return 'image/vnd.microsoft.icon';
        case '.iso': return 'application/octetstream';
        default: throw new Error(ext);
    }
}

export function make_json_response(status: number, x: any): Binary {
    return {
        status: status,
        mime: 'application/json',
        bytes: encoder.encode(JSON.stringify(x)),
    };
}

export function read_binary(status: number, p: string): Binary {
    return {
        status: status,
        mime: get_mime_type(p),
        bytes: Deno.readFileSync(p),
    }
}

async function read_request(request: Request) {
    if (request.body) {
        return toText(request.body);
    }
    else {
        throw new Error();
    }
}

async function parse_request(request: Request): Promise<[string, string, Record<string, Resource>]> {
    const url = new URL(request.url);
    const ct = (request.headers.get('content-type')||'').split(';')[0];

    const map: Record<string, Resource> = {};
    for (const p of url.searchParams) {
        map[p[0]] = p[1];
    }

    switch (ct) {
        case 'application/x-www-form-urlencoded': {
            const bodyParams = new URLSearchParams(await read_request(request));
            for (const [k, v] of bodyParams) {
                map[k] = v;
            }
            break;
        }
        case 'multipart/form-data': {
            const fd = await request.formData();
            for (const [k, v] of fd.entries()) {
                if (typeof v === 'string') {
                    map[k] = v;
                }
                else {
                    const x = v as Blob;
                    map[v.name] = new Uint8Array(await x.arrayBuffer());
                }
            }
            break;
        }
        case 'application/json': {
            map['data'] = JSON.parse(await read_request(request));
            break;
        }
        case 'text/plain': {
            map['data'] = await read_request(request);
            break;
        }
        default: break;
    }
    return [request.method, url.pathname, map];
}

async function handle_new_connection(request: Request, handle_request: RequestHandler) {
    const [method, path, map] = await parse_request(request);
    const bin = await handle_request(method, path, map, request);

    const headers = new Headers();
    headers.set("Cache-Control", 'max-age=0');
    headers.set("Cache-Control", 'no-store');
    headers.set("content-length", bin.bytes.length.toString());
    headers.set("content-type", bin.mime);
    headers.set("Referrer-Policy", "no-referrer");
    return new Response(new Blob([bin.bytes]), {
        headers: headers,
        status: bin.status || 200,
    });
}

export async function http_serve(port: number, handle_request: RequestHandler) {
    console.log(`Serving at http://localhost:${port}/`);
    Deno.serve({ port: port }, (request: Request) => handle_new_connection(request, handle_request));
}
