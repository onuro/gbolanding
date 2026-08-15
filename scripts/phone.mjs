/**
 * Puts the dev server in front of a real handset.
 *
 * getUserMedia only runs in a secure context, and localhost is the only
 * exception — a phone hitting http://192.168.x.x gets no microphone at all, so
 * the LAN address on its own cannot test a voice call. A Cloudflare quick
 * tunnel gives the dev server a real HTTPS hostname with a trusted certificate
 * and nothing to install on the phone.
 *
 *   npm run dev:phone               server + tunnel, HMR off
 *   PHONE_HMR=1 npm run dev:phone   ... with HMR, for editing between calls
 *
 * HMR is off by default on purpose: a hot reload during a call is a page
 * refresh, which is the exact thing under investigation.
 */
import { spawn, spawnSync } from "node:child_process";
import { watch } from "node:fs";
import { createConnection } from "node:net";
import { networkInterfaces } from "node:os";

const PORT = Number(process.env.PORT ?? 4321);
const children = [];

function run(command, args, env) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) child.kill("SIGTERM");
  // Astro daemonises the dev server, so killing our children leaves it holding
  // the port after Ctrl-C. Synchronous, because process.exit will not wait.
  try {
    spawnSync("npx", ["astro", "dev", "stop"], { stdio: "ignore" });
  } catch {
    // Nothing to stop, or npx is gone with the shell. Either way we are leaving.
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const listening = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    socket.on("connect", () => (socket.end(), resolve(true)));
    socket.on("error", () => resolve(false));
  });

async function waitForServer() {
  for (let i = 0; i < 120; i += 1) {
    if (await listening(PORT)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function lanAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
}

function banner(url) {
  const probe = `${url}/?probe=1`;
  const lan = lanAddress();
  const bar = "─".repeat(Math.max(52, probe.length + 4));
  console.log(`
┌${bar}
│  Open this on the iPhone:
│
│    ${probe}
│
│  ?probe=1 turns on the breadcrumb overlay. It survives a reload,
│  so whatever the last line of the "previous page life" block says
│  is the thing that took the page down.
│
│  Turkish page:  ${url}/tr?probe=1
│  No overlay:    ${url}/
${lan ? `│  LAN (no mic — http is not a secure context): http://${lan}:${PORT}/\n` : ""}│
│  Safari console over USB: iPhone Settings › Safari › Advanced ›
│  Web Inspector, then Mac Safari › Develop › <your iPhone>.
└${bar}
`);
}

// The lock file is per project, not per port, and Astro refuses --ignore-lock
// when it thinks an agent started it. Clearing it first is the only way to be
// sure the server that comes up is *this* one, with PHONE=1 set.
await new Promise((resolve) => {
  const stop = spawn("npx", ["astro", "dev", "stop"], { stdio: "ignore" });
  stop.on("exit", resolve);
  stop.on("error", resolve);
});

const server = run(
  "npx",
  ["astro", "dev", "--port", String(PORT), "--host", "--allowed-hosts"],
  { PHONE: "1" },
);
server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

if (!(await waitForServer())) {
  console.error(`\nastro dev never came up on ${PORT}.`);
  shutdown(1);
}

const tunnel = run("cloudflared", [
  "tunnel",
  "--url",
  `http://localhost:${PORT}`,
]);
tunnel.on("error", (error) => {
  console.error(
    error.code === "ENOENT"
      ? "\ncloudflared is not installed — `brew install cloudflared`.\n" +
          "Without it the phone can reach the LAN address above, but with no\n" +
          "microphone: getUserMedia needs HTTPS.\n"
      : `\ncloudflared failed: ${error.message}\n`,
  );
});

let announced = false;
const readTunnel = (chunk) => {
  const text = String(chunk);
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !announced) {
    announced = true;
    banner(match[0]);
  }
};
tunnel.stdout.on("data", readTunnel);
tunnel.stderr.on("data", readTunnel);

// Astro daemonises itself here, so the child exiting says nothing about whether
// the server is up — and when the daemon dies on its own the tunnel stays
// happily serving 502s, which reads to whoever is holding the phone as the
// fix having broken the site. Watch the port instead, and put the server back
// under the *same* tunnel: a quick tunnel gets a new hostname every time it
// restarts, and a URL that keeps changing mid-test is its own kind of tax.
let restarting = false;
let missed = null;

async function restart(why) {
  // A save landing mid-restart must not be dropped, or the phone goes back to
  // testing the previous version — the failure this watcher exists to prevent.
  if (restarting) {
    missed = why;
    return;
  }
  restarting = true;
  console.error(`\n[phone] ${why} — restarting the dev server.`);
  await new Promise((resolve) => {
    const stop = spawn("npx", ["astro", "dev", "stop"], { stdio: "ignore" });
    stop.on("exit", resolve);
    stop.on("error", resolve);
  });
  const replacement = run(
    "npx",
    ["astro", "dev", "--port", String(PORT), "--host", "--allowed-hosts"],
    { PHONE: "1" },
  );
  replacement.stdout.on("data", (chunk) => process.stdout.write(chunk));
  replacement.stderr.on("data", (chunk) => process.stderr.write(chunk));
  console.error(
    (await waitForServer())
      ? "[phone] back up — the URL above is unchanged.\n"
      : "[phone] could not bring it back.\n",
  );
  restarting = false;
  if (missed) {
    const why = missed;
    missed = null;
    await restart(why);
  }
}

setInterval(async () => {
  if (restarting || (await listening(PORT))) return;
  await restart(`dev server on ${PORT} went away`);
}, 5000);

// With HMR off, Astro's <style> and <script> blocks are compiled once and then
// served from cache — an edit to either goes unnoticed and the phone quietly
// tests the previous version, which is worse than no rig at all. Restarting on
// change is the blunt version of HMR that cannot reload the page mid-call.
let pending = null;
watch("src", { recursive: true }, (_event, file) => {
  if (!file || /(^|\/)\./.test(file)) return;
  clearTimeout(pending);
  pending = setTimeout(() => restart(`${file} changed`), 400);
});
