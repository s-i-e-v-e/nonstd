/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {copySync} from "https://deno.land/std/fs/copy.ts"

import DirEntry = Deno.DirEntry;

function fs_exists(path: string) {
    try {
        return Deno.statSync(path);
    }
    catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            return false;
        }
        else {
            throw e;
        }
    }
}

export function fs_dir_exists(path: string) {
    const x = fs_exists(path);
    return x && x.isDirectory;
}

export function fs_file_exists(path: string) {
    const x = fs_exists(path);
    return x && x.isFile;
}

export function fs_ls(path: string): DirEntry[] {
    return Array.from(Deno.readDirSync(path));
}

interface FileName {
    dir: string,
    name: string,
    ext: string,
}

export function fs_parse_path(path: string) {
    let n = path.lastIndexOf("/");
    const dir = n === -1 ? "." : path.substring(0, n);
    path = n === -1 ? path : path.substring(n + 1);

    n = path.lastIndexOf(".");
    const name = n === -1 ? path : path.substring(0, n);
    const ext = n === -1 ? '' : path.substring(n);
    return {
        dir: dir,
        name: name,
        ext: ext,
    } as FileName;
}

function fs_mkdir(dir: string) {
    if (!fs_exists(dir)) Deno.mkdirSync(dir, { recursive: true });
}

export function fs_cp(source: string, dest: string) {
    copySync(source, dest);
}

export function fs_write_utf8(p: string, data: string) {
    const fp = fs_parse_path(p);
    fs_mkdir(fp.dir);
    Deno.writeTextFileSync(p, data);
}

export function fs_read_utf8(p: string) {
    return Deno.readTextFileSync(p);
}

export function fs_read_utf8_list(path: string) {
    return fs_read_utf8(path).split('\n');
}

export function io_write_utf8_list(path: string, data: string[]) {
    fs_write_utf8(path, data.join('\n'));
}
