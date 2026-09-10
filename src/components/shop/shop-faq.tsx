import { NERA_FAQS } from "@/lib/nera-identity";

export function ShopFaq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12" aria-labelledby="faq-nera">
      <h2 id="faq-nera" className="font-serif text-4xl text-wine">
        Questions fréquentes
      </h2>
      <dl className="mt-8 space-y-6">
        {NERA_FAQS.map((item) => (
          <div key={item.question}>
            <dt className="font-serif text-xl text-wine">{item.question}</dt>
            <dd className="mt-2 leading-relaxed text-black/60">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
