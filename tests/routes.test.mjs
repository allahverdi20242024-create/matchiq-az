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
  ["/oyunlar/bu-gun", "Bu günün oyunları", "Real oyun təqvimi"],
  ["/oyunlar/sabah", "Sabahın oyunları", "Real oyun təqvimi"],
  ["/oyunlar/gelecek", "Qarşıdakı oyunlar", "Növbəti 7 günün real oyun təqvimi"],
  ["/oyun/xezer-zirve", "Oyun təhlili", 'href="/komandalar/xezer"'],
  ["/komandalar/xezer", "Xəzər FK", "Son beş oyunun forması"],
  ["/real-komandalar", "Real komanda statistikası", "Ev və səfər göstəriciləri"],
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
