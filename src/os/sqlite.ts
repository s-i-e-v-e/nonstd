/*
 * Copyright (c) 2023 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {Database} from "@db/sqlite";

export interface SqliteDatabase {
    execute: (q: string, xs?: any[]) => void,
    query: (q: string, xs?: any[]) => any[],
    begin: () => void,
    commit: () => void,
    term: () => void,
    table_is_empty: (table: string) => boolean,
    reindex: () => void,
}

export function sqlite_init(path: string, qs: string[]): SqliteDatabase {
    const db = new Database(path);
    for (const q of qs) {
        db.exec(q);
    }

    const execute = (q: string, ...xs: any) => {
        query(q, ...xs);
    };

    const query = (q: string, ...xs: any) : any[] => {
        const stmt = db.prepare(q);
        return stmt.values(...xs);
    };

    const begin = () => {
        db.exec("BEGIN;");
    }

    const commit = () => {
        db.exec("COMMIT;");
    }

    const term = () => {
        db.close();
    }

    const table_is_empty = (table: string) => {
        const xs = query(`select count(*) from ${table};`);
        return !Number(xs[0][0]);
    }

    const reindex = () => {
        db.exec("reindex;");
        for (const [msg] of query("pragma integrity_check;")) {
            console.log(`db::${msg}`);
        }
    }

    return {
        execute: execute,
        query: query,
        begin: begin,
        commit: commit,
        term: term,
        table_is_empty: table_is_empty,
        reindex: reindex,
    };
}