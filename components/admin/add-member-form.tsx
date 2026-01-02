"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export function AddMemberForm() {
  const [loading, setLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [dateError, setDateError] = useState("")
  const [membershipType, setMembershipType] = useState<"1_MONTH" | "3_MONTHS" | "1_YEAR">("1_MONTH")

  const validateDate = (dateString: string): boolean => {
    const datePattern = /^(\d{2})[./](\d{2})[./](\d{4})$/
    const match = dateString.match(datePattern)

    if (!match) {
      setDateError("Format mora biti DD.MM.YYYY ili DD/MM/YYYY")
      return false
    }

    const [, day, month, year] = match
    const dayNum = Number.parseInt(day)
    const monthNum = Number.parseInt(month)
    const yearNum = Number.parseInt(year)

    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      setDateError("Neispravan datum")
      return false
    }

    const inputDate = new Date(yearNum, monthNum - 1, dayNum)
    if (
      inputDate.getDate() !== dayNum ||
      inputDate.getMonth() !== monthNum - 1 ||
      inputDate.getFullYear() !== yearNum
    ) {
      setDateError("Datum ne postoji u kalendaru")
      return false
    }

    setDateError("")
    return true
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSubmitStatus("idle")
    setErrorMessage("")
    setDateError("")

    const formData = new FormData(e.currentTarget)
    const startDateInput = formData.get("startDate") as string

    if (!validateDate(startDateInput)) {
      setLoading(false)
      setSubmitStatus("error")
      setErrorMessage("Neispravan format datuma")
      return
    }

    const [day, month, year] = startDateInput.split(/[./]/)
    const startDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`

    const expiryDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))

    switch (membershipType) {
      case "1_MONTH":
        expiryDate.setMonth(expiryDate.getMonth() + 1)
        break
      case "3_MONTHS":
        expiryDate.setMonth(expiryDate.getMonth() + 3)
        break
      case "1_YEAR":
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)
        break
    }

    const expiryDateFormatted = expiryDate.toISOString().split("T")[0]

    const data = {
      first_name: formData.get("firstName"),
      last_name: formData.get("lastName"),
      email: formData.get("email"),
      start_date: startDate,
      expiry_date: expiryDateFormatted,
      membership_type: membershipType,
      status: "active",
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setSubmitStatus("success")
        ;(e.target as HTMLFormElement).reset()
        setMembershipType("1_MONTH")

        if ((window as any).refreshMembers) {
          try {
            await (window as any).refreshMembers()
          } catch (refreshError) {
            console.error("[v0] Failed to refresh members list:", refreshError)
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Greška pri dodavanju" }))
        setErrorMessage(errorData.error || "Server greška")
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("[v0] Add member error:", error)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setErrorMessage("Zahtev je istekao. Proverite konekciju.")
        } else {
          setErrorMessage("Greška pri dodavanju člana. Pokušajte ponovo.")
        }
      } else {
        setErrorMessage("Neočekivana greška")
      }

      setSubmitStatus("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backdrop-blur-md bg-card/20 border border-primary/20 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <UserPlus className="w-6 h-6 text-primary" />
        Додај члана
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Име</label>
          <input
            type="text"
            name="firstName"
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Презиме</label>
          <input
            type="text"
            name="lastName"
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input
            type="email"
            name="email"
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Датум почетка</label>
          <input
            type="text"
            name="startDate"
            required
            disabled={loading}
            placeholder="DD.MM.YYYY (нпр. 17.12.2025)"
            pattern="\d{2}[./]\d{2}[./]\d{4}"
            defaultValue={new Date().toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" })}
            onBlur={(e) => validateDate(e.target.value)}
            className={`w-full px-4 py-2 bg-background/50 border rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50 ${
              dateError ? "border-red-500" : "border-primary/20"
            }`}
          />
          {dateError && (
            <p className="text-sm text-red-500 flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-4 h-4" />
              {dateError}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Трајање чланарине</Label>
          <RadioGroup
            value={membershipType}
            onValueChange={(value) => setMembershipType(value as "1_MONTH" | "3_MONTHS" | "1_YEAR")}
            disabled={loading}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1_MONTH" id="1_month" className="border-primary/40" />
              <Label htmlFor="1_month" className="text-foreground font-normal cursor-pointer">
                1 месец
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3_MONTHS" id="3_months" className="border-primary/40" />
              <Label htmlFor="3_months" className="text-foreground font-normal cursor-pointer">
                3 месеца
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1_YEAR" id="1_year" className="border-primary/40" />
              <Label htmlFor="1_year" className="text-foreground font-normal cursor-pointer">
                1 година
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Додавање...
            </span>
          ) : (
            "Додај члана"
          )}
        </Button>

        {submitStatus === "success" && (
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDescription className="text-green-500 font-medium">Члан успешно додат!</AlertDescription>
          </Alert>
        )}

        {submitStatus === "error" && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertDescription className="text-red-500 font-medium">
              {errorMessage || "Грешка при додавању члана"}
            </AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  )
}
