"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

export function AddMemberForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const formData = new FormData(e.currentTarget)
    const startDateInput = formData.get("startDate") as string

    const [day, month, year] = startDateInput.split(/[./]/)
    const startDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`

    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      startDate: startDate,
    }

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setMessage("Члан успешно додат!")
        ;(e.target as HTMLFormElement).reset()
        if ((window as any).refreshMembers) {
          await (window as any).refreshMembers()
        }
      } else {
        setMessage("Грешка при додавању члана")
      }
    } catch (error) {
      setMessage("Грешка при додавању члана")
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
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Презиме</label>
          <input
            type="text"
            name="lastName"
            required
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Датум почетка</label>
          <input
            type="text"
            name="startDate"
            required
            placeholder="DD.MM.YYYY (нпр. 17.12.2025)"
            pattern="\d{2}[./]\d{2}[./]\d{4}"
            defaultValue={new Date().toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" })}
            className="w-full px-4 py-2 bg-background/50 border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? "Додавање..." : "Додај члана"}
        </Button>

        {message && (
          <p className={`text-sm text-center ${message.includes("успешно") ? "text-green-500" : "text-red-500"}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  )
}
