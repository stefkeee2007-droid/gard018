import { Button } from "@/components/ui/button"
import { Clock, Calendar, Dumbbell } from "lucide-react"
import Link from "next/link"

const schedule = [
  {
    day: "Ponedeljak",
    dayShort: "PON",
    classes: [{ time: "20:00 - 21:30", name: "Boks, Kik Boks, Muay Thai" }],
  },
  {
    day: "Utorak",
    dayShort: "UTO",
    classes: [{ time: "20:00 - 21:30", name: "Boks, Kik Boks, Muay Thai" }],
  },
  {
    day: "Četvrtak",
    dayShort: "ČET",
    classes: [{ time: "20:00 - 21:30", name: "Boks, Kik Boks, Muay Thai" }],
  },
  {
    day: "Petak",
    dayShort: "PET",
    classes: [{ time: "20:00 - 21:30", name: "Boks, Kik Boks, Muay Thai" }],
  },
]

export function Schedule() {
  return (
    <section id="raspored" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 px-6 py-2 rounded-full mb-6">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-primary uppercase tracking-[0.3em] text-sm font-medium">Raspored</p>
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            NEDELJNI RASPORED
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-6" />
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Izaberi termin koji ti odgovara i pridruži nam se u transformaciji svog života
          </p>
        </div>

        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {schedule.map((day, index) => (
              <div
                key={index}
                className="group relative bg-card/30 backdrop-blur-md border border-primary/20 rounded-lg overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(143,21,40,0.15)] hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative">
                  <div className="bg-gradient-to-r from-primary/90 to-primary p-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
                    <div className="relative">
                      <p className="text-primary-foreground/70 text-xs font-bold tracking-[0.2em] uppercase mb-1">
                        {day.dayShort}
                      </p>
                      <h3
                        className="text-primary-foreground text-xl font-bold uppercase tracking-wider"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {day.day}
                      </h3>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {day.classes.map((cls, idx) => (
                      <div key={idx} className="space-y-3">
                        <div className="flex items-center gap-3 text-primary">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider font-medium opacity-70">Vreme</p>
                            <p className="text-sm font-bold">{cls.time}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
                            <Dumbbell className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                              Program
                            </p>
                            <p className="text-foreground font-semibold text-sm leading-relaxed">{cls.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-sm">Spreman si za promenu?</p>
            <Link href="#kontakt">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider px-8 py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Kontaktiraj nas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
