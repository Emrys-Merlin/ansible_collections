/*
 * Create the initial Uptime Kuma admin user, if and only if there is not one
 * already. Run by emrys_merlin.uberspace.uptime_kuma; see
 * plans/19-uptime-kuma-uberspace.md.
 *
 * Uptime Kuma has no API for this — the UI does it over socket.io, and the
 * handler (server/server.js, `socket.on("setup", ...)`) does nothing but hash
 * the password and insert a row. server/password-hash.js is plain bcryptjs at
 * 10 rounds, so this reproduces it exactly using the modules Uptime Kuma has
 * already installed. Nothing here is version-specific beyond the `user` table
 * having (username, password, active), which has been stable since 1.x.
 *
 * This must run AFTER the server has started once: the `user` table is created
 * by knex migrations on first boot. And the server must be restarted AFTER it:
 * `needSetup` is computed once at startup, so an already-running instance keeps
 * serving the setup page until it is bounced.
 *
 * Credentials arrive in the environment, never in argv — argv is world-readable
 * through ps(1). Prints exactly one of CREATED or UNCHANGED, which is what the
 * calling task keys `changed_when` off.
 */

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const SALT_ROUNDS = 10;

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.KUMA_DB_HOSTNAME,
        port: Number(process.env.KUMA_DB_PORT),
        user: process.env.KUMA_DB_USERNAME,
        password: process.env.KUMA_DB_PASSWORD,
        database: process.env.KUMA_DB_NAME,
    });

    try {
        const [rows] = await connection.execute("SELECT COUNT(*) AS count FROM `user`");

        if (rows[0].count > 0) {
            console.log("UNCHANGED");
            return;
        }

        const hash = await bcrypt.hash(process.env.KUMA_ADMIN_PASSWORD, SALT_ROUNDS);

        await connection.execute(
            "INSERT INTO `user` (`username`, `password`, `active`) VALUES (?, ?, 1)",
            [ process.env.KUMA_ADMIN_USERNAME, hash ]
        );

        console.log("CREATED");
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
