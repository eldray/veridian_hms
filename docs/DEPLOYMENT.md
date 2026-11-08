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
