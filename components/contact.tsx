"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Phone, Mail } from "lucide-react"

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus("success")
        setFormData({ name: "", email: "", phone: "", message: "" })
      } else {
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="kontakt" className="py-24 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-primary uppercase tracking-[0.3em] text-sm mb-4 font-medium">Kontakt</p>
          <h2
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            JAVI NAM SE
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mb-6" />
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Imaš pitanja? Kontaktiraj nas ili nas poseti u našoj sali
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <div className="bg-card/50 backdrop-blur-sm border border-primary/10 rounded-sm p-8 mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-heading)" }}>
                KONTAKT INFORMACIJE
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-sm flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold mb-1">Adresa</p>
                    <p className="text-muted-foreground">
                      Светозара Милетића 10
                      <br />
                      18000 Ниш, Србија
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-sm flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold mb-1">Telefon</p>
                    <p className="text-muted-foreground">069 010 5213</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-sm flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold mb-1">Email</p>
                    <p className="text-muted-foreground">ognjen.boks19@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="aspect-video rounded-sm overflow-hidden border border-primary/10 bg-background/50">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2905.8234!2d21.8932555!3d43.3134497!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4755b10d98e7824d%3A0x4f48ac7a0ed77ecc!2sKIK%20BOKS%20KLUB%20GARD%20018!5e0!3m2!1sen!2srs!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0, filter: "grayscale(20%) brightness(90%)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-primary/10 rounded-sm p-8">
            <h3 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              POŠALJI PORUKU
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="text-sm text-muted-foreground uppercase tracking-wider mb-2 block">
                  Ime i prezime
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-primary/5 border-primary/20 text-foreground"
                  placeholder="Unesite ime i prezime"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm text-muted-foreground uppercase tracking-wider mb-2 block">
                  Email adresa
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-primary/5 border-primary/20 text-foreground"
                  placeholder="vasa@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="text-sm text-muted-foreground uppercase tracking-wider mb-2 block">
                  Broj telefona
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-primary/5 border-primary/20 text-foreground"
                  placeholder="+381 63 123 4567"
                />
              </div>

              <div>
                <label htmlFor="message" className="text-sm text-muted-foreground uppercase tracking-wider mb-2 block">
                  Poruka
                </label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-primary/5 border-primary/20 text-foreground min-h-[150px]"
                  placeholder="Napišite vašu poruku..."
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider"
              >
                {isSubmitting ? "Šalje se..." : "Pošalji poruku"}
              </Button>

              {submitStatus === "success" && <p className="text-green-500 text-center">Poruka je uspešno poslata!</p>}
              {submitStatus === "error" && (
                <p className="text-red-500 text-center">Greška prilikom slanja poruke. Pokušajte ponovo.</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
