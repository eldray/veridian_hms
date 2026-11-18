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
3. Choose which **network connections serve other PCs**. Only the ones ticked listen; a cable (Ethernet) is ticked by default and Wi-Fi is not. Windows then asks for administrator approval to open the app port (default 5000) for this network only. Approve it.
4. Right-click the tray icon -> "Show address for other PCs", and "Secure connection code..." (see below). Give the server a fixed IP (router DHCP reservation) so the address never changes.
5. Closing the window only hides it; use the tray's "Quit server" to stop it (other PCs lose access).

## Workstations
Install the **Client** installer and enter the server address once (for example `192.168.1.10:5000`). The client then shows a **code**: compare it with the one on the server PC (File -> Secure connection code) and only continue if they are identical. The address can be changed later under File -> Server address. Use the client app, not a browser: a browser cannot verify the server's private certificate.

## Notes
- Everything between PCs is encrypted (see "Secure connections" below). Plain HTTP is never served to the network.
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

### Development: the server listens while it seeds

In development (`npm start` / `npm run dev`) the demo seed can take 25+ minutes. The API now starts
listening first: until the seed finishes, `/api/health` answers `503` with `{ "phase": "seeding",
"progress": "..." }` and every other API call answers a clear `503`, instead of the connection being
refused. The Electron window shows "Waiting for the development server..." and then the seed progress
live, and opens the app when the API is ready. This never applies to the installed app, which does not
seed demo data.

## Secure connections (LAN)

Passwords, login tokens and patient data never cross the network in clear text.

**How it works.** The server creates its own private *certificate authority* the first time it serves other PCs, and signs its own server certificate with it. A hospital LAN has no domain or internet for a public certificate, so this is the right tool when you control both ends. A client **pins** that authority when it pairs, so nothing else is ever accepted for that server, and there is no "continue anyway" prompt to click through. The keys live in `pki.json` in the app's data folder and are protected by Windows data protection (as the database password is).

**Pairing a PC (once).** On the client, enter the server address. It shows a code such as `9ED0-8986-6566-5193-2D01-1E58`. On the server PC choose File -> Secure connection code (or the tray menu) and check it shows exactly the same code. Only then click "The codes match". This comparison is the one step software cannot do for you: it is what proves nobody is intercepting the connection.

**Which network connection serves other PCs.** A PC with a cable and Wi-Fi is reachable from both. By default only wired, non-virtual adapters listen; you can change this in Database settings. The server listens on exactly the chosen adapters' addresses (plus this PC's own), so an adapter nobody chose is not listening at all. If the chosen adapter is unplugged, the server stays reachable from this PC only and logs a warning.

**When the server's address changes.** The server notices at the next start and issues a new server certificate under the same authority. Clients do not have to pair again. Use a fixed address (DHCP reservation) so other PCs can still find it.

**If something looks wrong.**

| Message on a client | Meaning |
|---|---|
| "The server's identity could not be verified" | The server is not presenting a certificate from the authority this PC paired with. Expected after a server reinstall or a reset; otherwise treat it as an interception attempt and do not continue. |
| "this address was paired before with a DIFFERENT code" | Same address, different authority. Compare the codes with the server PC before trusting. |
| "not valid yet" / "has expired" | Check the clock of the client and the server. |

File -> Reset secure connection (server) creates a new authority. Every client then has to pair again. Use it if the server PC was lost or the keys may have been exposed.

**Limits.** This protects traffic between PCs. It does not protect a PC that is itself compromised, and anyone with administrator access to the server PC can read its keys. Development runs (`npm start`) stay on plain loopback HTTP and are unaffected.
