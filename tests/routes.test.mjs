import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { after, before, test } from "node:test";

let server;
let baseUrl;

before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "0"], {
    windowsHide: true,
  });
  server.stderr.pipe(process.stderr);
  const port = await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error("Next.js startup timed out")), 15_000);
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error("Next.js exited with status " + code)));
    server.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match && output.includes("Ready")) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });
  baseUrl = "http://127.0.0.1:" + port;
});

after(async () => {
  if (server?.pid && server.exitCode === null && server.signalCode === null) {
    const closed = once(server, "close");
    server.kill();
    await closed;
  }
});

const pages = [
  ["/", "İdarə paneli", 'href="/oyun/xezer-zirve"'],
  ["/oyunlar/bu-gun", "Bu günün oyunları", 'name="tarix"'],
  ["/oyunlar/sabah", "Sabahın oyunları", 'name="tarix"'],
  ["/oyunlar/gelecek", "Qarşıdakı oyunlar", 'name="tarix"'],
  ["/oyun/xezer-zirve", "Oyun təhlili", 'href="/komandalar/xezer"'],
  ["/komandalar/xezer", "Xəzər FK", "Son beş oyunun forması"],
  ["/real-komandalar", "Real komanda statistikası", "Real komanda statistikası"],
  ["/tarixce", "Proqnoz tarixçəsi", "Modelin tarixi sınağı"],
  ["/metodologiya", "Model metodologiyası", "100 000"],
];

for (const [path, heading, expected] of pages) {
  test(path + " returns a localized page with the expected content", async () => {
    const response = await fetch(baseUrl + path, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('<html lang="az"'));
    assert.ok(html.includes("<h1>" + heading + "</h1>"));
    if (path === "/") {
      assert.ok(html.includes("Nümayiş məlumatları"));
      assert.ok(html.includes("Qarşıdakı real oyunlar"));
      assert.ok(html.includes("Real oyunlara bax"));
    }
    assert.ok(html.includes(expected));
  });
}

test("unknown fixture, period, and team return localized missing pages", async () => {
  for (const path of ["/oyun/namelum", "/oyunlar/namelum", "/komandalar/namelum"]) {
    const response = await fetch(baseUrl + path, { signal: AbortSignal.timeout(5000) });
    const html = await response.text();
    assert.equal(response.status, 404, path);
    assert.ok(html.includes("Səhifə tapılmadı"), path);
  }
});

test("real match route is separate from demonstration mode", async () => {
  const response = await fetch(baseUrl + "/real-oyunlar", { signal: AbortSignal.timeout(6000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("<h1>Real oyunlar</h1>"));
  assert.ok(html.includes('href="/real-oyunlar?nov=neticeler"'));
  const pageMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  assert.doesNotMatch(pageMarkup, /Nümayiş rejimi|Nümayiş mühiti/);
});

test("the old team list redirects to real teams", async () => {
  const response = await fetch(baseUrl + "/komandalar", { redirect: "manual", signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/real-komandalar");
});

test("language and theme changes persist across routes and support switching back", async () => {
  const cookies = new Map();
  const pathname = "/real-oyunlar?nov=neticeler";
  async function request(path, options = {}) {
    const cookie = [...cookies].map(([key, value]) => key + "=" + value).join("; ");
    const response = await fetch(baseUrl + path, {
      ...options,
      headers: { origin: baseUrl, ...(cookie ? { cookie } : {}) },
      signal: AbortSignal.timeout(8000),
    });
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    assert.equal(response.status, 200);
    return response.text();
  }

  async function choose(html, name, value) {
    const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
      .find(([, markup]) => markup.includes(`name="${name}"`));
    assert.ok(form, name);
    const [action] = form[1].match(/\$ACTION_ID_[a-z0-9]+/) ?? [];
    assert.ok(action);
    const body = new FormData();
    body.set(action, "");
    body.set(name, value);
    return request(pathname, { method: "POST", body });
  }

  let html = await request(pathname);
  assert.match(html, /<html lang="az" data-theme="dark"/);
  html = await choose(html, "language", "en");
  assert.match(html, /<html lang="en" data-theme="dark"/);
  assert.match(html, /<h1>Real fixtures<\/h1>/);
  assert.match(html, /aria-current="page"[^>]*>Recent results<\/a>/);
  html = await choose(html, "theme", "light");
  assert.match(html, /<html lang="en" data-theme="light"/);

  const home = await request("/");
  assert.match(home, /<html lang="en" data-theme="light"/);
  assert.match(home, /<h1>Dashboard<\/h1>/);
  assert.match(await request("/oyun/xezer-zirve"), /Most likely scores/);

  html = await choose(html, "language", "az");
  assert.match(html, /<html lang="az" data-theme="light"/);
  html = await choose(html, "theme", "dark");
  assert.match(html, /<html lang="az" data-theme="dark"/);
});

test("the calendar accepts a date through one navigation link", async () => {
  const response = await fetch(baseUrl + "/oyunlar?tarix=2026-11-21", { signal: AbortSignal.timeout(5000) });
  const page = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  assert.equal(response.status, 200);
  assert.match(page, /<h1>Oyun cədvəli<\/h1>/);
  assert.match(page, /<input[^>]+type="date"[^>]+value="2026-11-21"/);
  assert.match(page, /href="\/oyunlar"/);
  assert.doesNotMatch(page, /href="\/oyunlar\/(bu-gun|sabah|gelecek)"/);
});
