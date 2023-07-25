/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {copySync} from "https://deno.land/std/fs/copy.ts"

import DirEntry = Deno.DirEntry;

export function fs_canonical_path(path: string) {
    const home = Deno.env.get('HOME');
    if (!home) throw new Error('$HOME is not defined.');
    const xdg_config_home = Deno.env.get('XDG_CONFIG_HOME') || `${home}/.config`;

    path = path.replace('$XDG_CONFIG_HOME', xdg_config_home);
    path = path.replace('$HOME', home);
    return path;
}

function fs_exists(path: string) {
    try {
        path = fs_canonical_path(path);
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
    path = fs_canonical_path(path);
    return Array.from(Deno.readDirSync(path));
}

export function fs_list_files(path: string): string[] {
    return fs_ls(path).filter(x => x.isFile).map(x => x.name).sort();
}

export function fs_list_directories(path: string): string[] {
    return fs_ls(path).filter(x => x.isDirectory).map(x => x.name).sort();
}

interface FileName {
    dir: string,
    name: string,
    ext: string,
    path: string,
}

export function fs_parse_path(path: string) {
    path = fs_canonical_path(path);
    let n = path.lastIndexOf("/");
    const dir = n === -1 ? "." : path.substring(0, n);
    path = n === -1 ? path : path.substring(n + 1);

    if (path === '.' || path === '..') throw new Error();
    n = path.lastIndexOf(".");
    const name = n === -1 ? path : path.substring(0, n);
    const ext = n === -1 ? '' : path.substring(n);
    return {
        dir: dir,
        name: name,
        ext: ext,
        path: `${dir}/${name}${ext}`
    } as FileName;
}

function fs_mkdir(path: string) {
    path = fs_canonical_path(path);
    if (!fs_exists(path)) Deno.mkdirSync(path, { recursive: true });
}

export function fs_mv(source: string, dest: string) {
    source = fs_canonical_path(source);
    dest = fs_canonical_path(dest);
    if (fs_exists(dest)) throw new Error(`File already exists: ${dest}`);
    const fp = fs_parse_path(dest);
    if (fp.name) fs_mkdir(fp.dir);
    Deno.renameSync(source, dest);
}

export function fs_cp(source: string, dest: string, overwrite = false) {
    source = fs_canonical_path(source);
    dest = fs_canonical_path(dest);
    copySync(source, dest, {overwrite: overwrite});
}

export function fs_write_bin(path: string, data: Uint8Array) {
    const fp = fs_parse_path(path);
    fs_mkdir(fp.dir);
    Deno.writeFileSync(fp.path, data);
}

export function fs_read_bin(path: string) {
    path = fs_canonical_path(path);
    return Deno.readFileSync(path);
}

export function fs_write_utf8(path: string, data: string) {
    const fp = fs_parse_path(path);
    fs_mkdir(fp.dir);
    Deno.writeTextFileSync(fp.path, data);
}

export function fs_read_utf8(path: string) {
    path = fs_canonical_path(path);
    return Deno.readTextFileSync(path);
}

export function fs_read_utf8_list(path: string) {
    path = fs_canonical_path(path);
    return fs_read_utf8(path).split('\n');
}

export function fs_write_utf8_list(path: string, data: string[]) {
    path = fs_canonical_path(path);
    fs_write_utf8(path, data.join('\n'));
}
