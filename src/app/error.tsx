"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel empty"><h1>Səhifə yüklənmədi</h1><p>Bir az sonra yenidən cəhd edin.</p><button className="primary" type="button" onClick={reset}>Yenidən cəhd et</button></section>;
}
