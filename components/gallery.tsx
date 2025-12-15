"use client"

import { useState } from "react"
import { X } from "lucide-react"

const images = [
  {
    src: "https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzl974wBYKOrN8v0Cmyz-YFpu0FKEub-6VCKtF-junCoyrMB_zIUrjjbTr_jFds7tQmFOJF5H0ZAC6kAy6UZJCmxstRKmbA6xdUaVq3XgPdDpJcwYoQ253u0VH-HUnpfAaFC157=w1600-h1200",
    alt: "Gard 018 klub",
  },
  {
    src: "https://lh3.googleusercontent.com/p/AF1QipO63lNTKppagPikdW7qeCnVmY-3O7Uu0RYoWInb=w800-h1000-k-no",
    alt: "Takmičari Gard 018",
  },
  {
    src: "https://lh3.googleusercontent.com/p/AF1QipPC9cDcShUhDJcDkgHay4u6GRebLuEExMrpP6xk=w1152-h2048-k-no",
    alt: "Trening u sali",
  },
  {
    src: "https://lh3.googleusercontent.com/p/AF1QipN-xu6TrolMP28LXEc9ARwj9ruLt-vPMqyPSlpU=w800-h1000-k-no",
    alt: "Naši takmičari",
  },
  {
    src: "https://lh3.googleusercontent.com/p/AF1QipPuVMRkf6qtFz2mM-rn4MJFxT6SH5_MPlOSIEfm=w1600-h1000-k-no",
    alt: "Grupni trening",
  },
  {
    src: "https://lh3.googleusercontent.com/p/AF1QipP_sZWsnMzGS7JjUazmVfJZVb8iEYTcMSV_NlZK=w1600-h1000-k-no",
    alt: "Sala za trening",
  },
]

export function Gallery() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <section id="galerija" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-primary uppercase tracking-[0.3em] text-sm mb-4 font-medium">Galerija</p>
          <h2
            className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            IZ NAŠEG KLUBA
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(image.src)}
              className="relative aspect-[4/3] overflow-hidden rounded-sm group cursor-pointer"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url('${image.src}')` }}
              />
              <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-foreground text-sm uppercase tracking-wider">{image.alt}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-foreground hover:text-primary transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage || "/placeholder.svg"}
            alt="Uvećana slika"
            className="max-w-full max-h-[90vh] object-contain rounded-sm"
          />
        </div>
      )}
    </section>
  )
}
