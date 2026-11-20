import Link from "next/link";

export default function NotFound() {
  return <section className="panel empty"><h1>Səhifə tapılmadı</h1><p>Bu ünvan üzrə səhifə mövcud deyil.</p><Link className="primary" href="/">İdarə panelinə qayıt</Link></section>;
}
