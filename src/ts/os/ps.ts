/*
 * Copyright (c) 2022 Sieve (https://github.com/s-i-e-v-e)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export async function ps_exec(cwd: string, cmd: string[]) {
    const p = Deno.run({
        cwd: cwd,
        cmd: cmd
    });

    const status = await p.status();
    if (!status.success) throw new Error(`Failed: ${cmd.join(' ')}`);
}