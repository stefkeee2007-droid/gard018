"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.email.split("@")[0],
        }),
      })

      const data = await response.json()

      if (response.ok) {
        window.location.href = "/"
      } else {
        setError(data.error || "Prijava nije uspela. Pokušajte ponovo.")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Greška pri prijavi. Proverite internet konekciju.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-xl">
      <CardContent className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-foreground font-medium text-sm">
              Email adresa
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vas@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-background border-primary/20 text-foreground placeholder:text-muted-foreground h-12 text-base focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-foreground font-medium text-sm">
              Lozinka
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-background border-primary/20 text-foreground placeholder:text-muted-foreground pr-12 h-12 text-base focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button type="button" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
              Zaboravili ste lozinku?
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Prijavljivanje...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Prijavi se
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
