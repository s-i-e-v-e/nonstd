/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {text_bin_to_utf8} from "../data/text.ts";

export async function ps_exec(cwd: string, cmd: string[], redirect_io = false) {
    const p = Deno.run({
        cwd: cwd,
        cmd: cmd,
        stdout: redirect_io ? "piped" : "inherit",
        stderr: redirect_io ? "piped" : "inherit",
    });
    let out = undefined;
    let err = undefined;
    if (redirect_io) {
        out = text_bin_to_utf8(await p.output());
        err = text_bin_to_utf8(await p.stderrOutput());
     }

    const status = await p.status();

    if (!status.success) throw new Error(`Failed: ${cmd.join(' ')}`);

    if (redirect_io) {
        return [out, err];
    }
    else {
        return [];
    }
}