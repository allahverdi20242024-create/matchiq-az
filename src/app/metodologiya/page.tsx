const steps = [
  ["Məlumatların hazırlanması", "Model oyun başlamazdan əvvəl əlçatan olan nəticələrdən ev və səfər üzrə hücum və müdafiə gücünü qiymətləndirəcək. Son oyunlara daha çox çəki veriləcək."],
  ["Puasson modeli və Monte Karlo", "Hər komandanın gözlənilən qol sayı əsasında oyun başına 100 000 sınaq planlaşdırılır. Sınaqların sayı daha sabit ehtimal hesablamalarına kömək edir. Proqnozun dəqiqliyi tarixi qiymətləndirmə ilə ölçüləcək."],
  ["Tarixi qiymətləndirmə", "Proqnozlar xronoloji ardıcıllıqla hazırlanacaq. Brier göstəricisi, loqarifmik itki və kalibrləmə sadə müqayisə modelləri ilə yoxlanılacaq."],
] as const;

export default function Methodology() {
  return <>
    <div className="heading"><div><h1>Model metodologiyası</h1><p>Statistik model üçün nəzərdə tutulan yanaşma</p></div></div>
    <div className="method-grid">{steps.map(([title, description]) => <section key={title} className="panel detail"><h2>{title}</h2><p className="muted">{description}</p></section>)}</div>
  </>;
}
