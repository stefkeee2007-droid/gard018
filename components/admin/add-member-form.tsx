"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function AddMemberForm() {
  const [loading, setLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>("")

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}.`
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSubmitStatus("idle")
    setErrorMessage("")

    const formData = new FormData(e.currentTarget)

    const expiryDateInput = formData.get("expiryDate") as string

    const data = {
      first_name: formData.get("firstName"),
      last_name: formData.get("lastName"),
      email: formData.get("email"),
      start_date: new Date().toISOString().split("T")[0], // Today
      expiry_date: expiryDateInput,
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
        setSelectedDate("")

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
          <label className="block text-sm font-medium text-foreground mb-2">Датум истека чланарине</label>
          <input
            type="date"
            name="expiryDate"
            required
            disabled={loading}
            min={new Date().toISOString().split("T")[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
          {selectedDate && (
            <p className="text-sm text-primary mt-1">Изабрани датум: {formatDateDisplay(selectedDate)}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Изаберите било који датум у будућности</p>
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
