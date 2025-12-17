"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Save, Upload, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/prijava")
          return
        }
        setUser(data.user)
        setName(data.user.name || "")
        setImageUrl(data.user.image || "")
        setPreviewUrl(data.user.image || "")
        setIsLoading(false)
      })
      .catch(() => {
        router.push("/prijava")
      })
  }, [router])

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Molimo izaberite sliku")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        setImageUrl(url)
        setPreviewUrl(url)
      } else {
        alert("Greška pri upload-ovanju slike")
      }
    } catch (error) {
      alert("Greška pri upload-ovanju slike")
    }
    setIsUploading(false)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: imageUrl }),
      })

      if (res.ok) {
        alert("Profil uspešno ažuriran!")
        window.location.reload()
      } else {
        alert("Greška pri čuvanju profila")
      }
    } catch (error) {
      alert("Greška pri čuvanju profila")
    }
    setIsSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    try {
      const res = await fetch("/api/profile/delete", { method: "POST" })
      if (res.ok) {
        alert("Nalog uspešno obrisan")
        window.location.href = "/"
      } else {
        alert("Greška pri brisanju naloga")
      }
    } catch (error) {
      alert("Greška pri brisanju naloga")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Učitavanje...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazad na početnu
        </Link>

        <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Podešavanja profila</h1>

          {/* Profile Image */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-3">Profilna slika</label>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                {previewUrl ? (
                  <Image src={previewUrl || "/placeholder.svg"} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-4xl text-primary">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                {/* Drag & Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                    dragActive ? "border-primary bg-primary/10" : "border-primary/30 hover:border-primary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0])
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 text-foreground">
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Učitavanje...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Prevucite sliku ili kliknite
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP (max 5MB)</p>
                  </label>
                </div>
                {previewUrl && (
                  <Button
                    onClick={() => {
                      setImageUrl("")
                      setPreviewUrl("")
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-red-500 border-red-500 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Ukloni sliku
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-3">Ime i prezime</label>
            <Input
              type="text"
              placeholder="Vaše ime"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-primary/20"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-3">Email adresa</label>
            <Input
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-background/30 border-primary/20 opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-2">Email adresa se ne može promeniti</p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-4"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Čuvanje..." : "Sačuvaj promene"}
          </Button>

          {/* Delete Account */}
          <div className="pt-8 border-t border-primary/20">
            <h2 className="text-xl font-semibold text-foreground mb-4">Opasna zona</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Brisanje naloga je trajno i ne može se opozvati. Svi vaši podaci uključujući članarinu biće obrisani.
            </p>
            {!showDeleteConfirm ? (
              <Button
                onClick={handleDeleteAccount}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500/10 bg-transparent"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Obriši nalog
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Potvrdi brisanje
                </Button>
                <Button onClick={() => setShowDeleteConfirm(false)} variant="outline">
                  Otkaži
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
