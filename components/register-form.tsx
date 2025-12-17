"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Eye, EyeOff, UserPlus } from "lucide-react"

export function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [membershipPaid, setMembershipPaid] = useState<"paid" | "unpaid">("unpaid")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    paymentDate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms) return

    setIsLoading(true)

    try {
      let startDate = null
      let expiryDate = null

      if (membershipPaid === "paid" && formData.paymentDate) {
        const [day, month, year] = formData.paymentDate.split("/")
        startDate = `${year}-${month}-${day}`
        const expiry = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
        expiry.setMonth(expiry.getMonth() + 1)
        expiryDate = expiry.toISOString().split("T")[0]
      }

      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      })

      if (!registerResponse.ok) {
        const error = await registerResponse.json()
        alert(error.error || "Greška pri registraciji")
        setIsLoading(false)
        return
      }

      // Add member to database
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          start_date: startDate || new Date().toISOString().split("T")[0],
          expiry_date: expiryDate || new Date().toISOString().split("T")[0],
          status: membershipPaid === "paid" ? "active" : "expired",
        }),
      })

      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Registration failed:", error)
      alert("Greška pri registraciji")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground">
                Ime
              </Label>
              <Input
                id="firstName"
                name="given-name"
                type="text"
                autoComplete="given-name"
                placeholder="Vaše ime"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground">
                Prezime
              </Label>
              <Input
                id="lastName"
                name="family-name"
                type="text"
                autoComplete="family-name"
                placeholder="Vaše prezime"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
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
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">
              Broj telefona
            </Label>
            <Input
              id="phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              placeholder="+381 6X XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">Status članarine</Label>
            <RadioGroup value={membershipPaid} onValueChange={(value) => setMembershipPaid(value as "paid" | "unpaid")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" className="border-border text-primary" />
                <Label htmlFor="paid" className="text-foreground font-normal cursor-pointer">
                  Plaćena
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unpaid" id="unpaid" className="border-border text-primary" />
                <Label htmlFor="unpaid" className="text-foreground font-normal cursor-pointer">
                  Nije plaćena
                </Label>
              </div>
            </RadioGroup>
          </div>

          {membershipPaid === "paid" && (
            <div className="space-y-2">
              <Label htmlFor="paymentDate" className="text-foreground">
                Datum uplate članarine
              </Label>
              <Input
                id="paymentDate"
                type="text"
                placeholder="DD/MM/GGGG (npr. 15/12/2024)"
                value={formData.paymentDate}
                onChange={(e) => {
                  // Allow only numbers and slashes
                  const value = e.target.value.replace(/[^\d/]/g, "")
                  setFormData({ ...formData, paymentDate: value })
                }}
                pattern="\d{2}/\d{2}/\d{4}"
                required
                className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-10"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Lozinka
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimum 8 karaktera"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              className="mt-1 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              Slažem se sa <span className="text-primary hover:underline">uslovima korišćenja</span> i{" "}
              <span className="text-primary hover:underline">politikom privatnosti</span>
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Registracija...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Registruj se
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
