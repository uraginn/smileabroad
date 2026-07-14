import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/destinations")({
  head: () => ({
    meta: [
      { title: "Destinations — SmileAbroad" },
      {
        name: "description",
        content: "Compare top dental destinations: Turkey, Hungary, Mexico and more.",
      },
    ],
  }),
  component: Destinations,
});

const dests = [
  {
    name: "Istanbul",
    country: "Turkey",
    img: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80",
    desc: "Where Europe meets Asia. Boutique clinics, world-class implantologists, unbeatable value.",
    clinics: 12,
    savings: "Up to 70%",
  },
  {
    name: "Budapest",
    country: "Hungary",
    img: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1200&q=80",
    desc: "The dental capital of Europe. In-house labs, English-speaking teams, thermal spa recovery.",
    clinics: 8,
    savings: "Up to 60%",
  },
  {
    name: "Cancún",
    country: "Mexico",
    img: "https://images.unsplash.com/photo-1552074283-f88c1e0ea3c9?w=1200&q=80",
    desc: "US-trained dentists, beachside recovery, and a favourite for North American patients.",
    clinics: 6,
    savings: "Up to 65%",
  },
];

function Destinations() {
  return (
    <>
      <section className="gradient-hero py-20">
        <div className="container-app max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">Destinations</p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">
            Choose where you want your smile made.
          </h1>
        </div>
      </section>
      <section className="container-app py-16 space-y-16">
        {dests.map((d, i) => (
          <div
            key={d.name}
            className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            <img src={d.img} alt={d.name} className="rounded-2xl aspect-[4/3] object-cover" />
            <div>
              <p className="text-sm text-muted-foreground">{d.country}</p>
              <h2 className="font-display text-4xl font-semibold mt-1">{d.name}</h2>
              <p className="mt-4 text-muted-foreground">{d.desc}</p>
              <div className="mt-6 flex gap-6 text-sm">
                <div>
                  <p className="text-2xl font-display font-semibold">{d.clinics}</p>
                  <p className="text-muted-foreground">Verified clinics</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold text-accent">{d.savings}</p>
                  <p className="text-muted-foreground">Vs. home country</p>
                </div>
              </div>
              <Link
                to="/clinics"
                className="inline-block mt-6 text-primary font-medium hover:underline"
              >
                Browse clinics in {d.name} →
              </Link>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
