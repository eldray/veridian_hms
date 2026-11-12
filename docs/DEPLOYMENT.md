# Deploying Veridian HMS

Three Windows installers are built from this repository. Pick by role:

| Installer | Build command | Install on | What it runs |
|---|---|---|---|
| **Server** | `npm run build:win:server` | ONE PC per hospital | API, database link, scheduled jobs (e.g. ward charges). Lives in the tray, starts with Windows, always accepts other PCs. |
| **Client** | `npm run build:win:client` | Every workstation | Only a window onto the server. No backend, no database access, no scheduled jobs. |
| **Standalone** | `npm run build:win` | A single-PC site | Everything on one PC (original behaviour). |

Outputs land in `release/server`, `release/client` and `release/standalone`.
`npm run build:win:all` builds server + client.

## Server PC
1. Install PostgreSQL 14+ (on this PC or another one) and the **Server** installer.
2. First run: enter the PostgreSQL details and the administrator password. Reference data is loaded; no demo data.
3. Windows asks for administrator approval to open the app port (default 5000). Approve it.
4. Right-click the tray icon -> "Show address for other PCs". Give the server a fixed IP (router DHCP reservation) so the address never changes.
5. Closing the window only hides it; use the tray's "Quit server" to stop it (other PCs lose access).

## Workstations
Install the **Client** installer, enter the server address once (for example `192.168.1.10:5000`). The address can be changed later under File -> Server address. A normal browser pointed at the same address also works.

## Notes
- Traffic on the network is plain HTTP. Use a trusted private network, or put a TLS reverse proxy in front and enter its `https://` address in the client.
- Back up the PostgreSQL database regularly; only the server PC needs `pg_dump`.

## Restarting the server and resetting the database

Both are in the **File** menu (and the system tray icon on a Server PC). Client PCs do not have them.

**Restart server** stops and starts the bundled backend. In a development run (`npm run dev`) it
touches `backend/src/server.ts` so `tsx watch` reloads, then waits until `/api/health` shows the
server really restarted.

**Reset database...** erases the hospital database and rebuilds it as a new installation:

- Packaged app: opens a confirmation window. You must type the database name and choose a new
  administrator password (used for `superadmin` and `admin`). If `pg_dump` is installed, a backup is
  written first to `<data folder>/backups/pre-reset/`; if it is not, you must tick a box accepting
  that no backup exists. If the backup fails, nothing is erased. Reference data is reloaded; no demo
  data is ever loaded.
- If the rebuild fails after the data was erased, the app reopens the setup screen so you can finish it.
- Development run: `prisma db push --force-reset` then the demo seed, then a server restart.
  Only works when `DATABASE_URL` points at this PC.

The reset can only be started from the native menu. It is deliberately not available to the web page.
