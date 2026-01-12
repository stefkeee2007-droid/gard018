"use client"

import type React from "react"

import { Calendar, Mail, User, AlertCircle, CheckCircle, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface Member {
  id: number
  first_name: string
  last_name: string
  email: string
  start_date: string
  expiry_date: string
  status: string
  membership_type?: string
  created_at: string
}

export function MembersList({ members }: { members: Member[] }) {
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [newExpiryDate, setNewExpiryDate] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-500"
      case "expired":
        return "text-red-500"
      case "notified":
        return "text-yellow-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5" />
      case "expired":
        return <AlertCircle className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)

    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}.`
  }

  const parseDateToISO = (ddmmyyyy: string): string | null => {
    const cleaned = ddmmyyyy.replace(/\./g, "")
    if (cleaned.length !== 8) return null

    const day = cleaned.substring(0, 2)
    const month = cleaned.substring(2, 4)
    const year = cleaned.substring(4, 8)

    const dayNum = Number.parseInt(day, 10)
    const monthNum = Number.parseInt(month, 10)
    const yearNum = Number.parseInt(year, 10)

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 2020) {
      return null
    }

    return `${year}-${month}-${day}`
  }

  const formatISOToDisplay = (isoDate: string): string => {
    const [year, month, day] = isoDate.split("-")
    return `${day}.${month}.${year}`
  }

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    let value = input.value.replace(/[^\d.]/g, "")

    // Ukloni višestruke tačke
    const parts = value.split(".")
    if (parts.length > 3) {
      value = parts.slice(0, 3).join(".")
    }

    // Auto-padding kada korisnik unese tačku nakon jednocifrenog broja
    if (value.endsWith(".")) {
      const beforeDot = value.slice(0, -1)
      const lastPart = beforeDot.split(".").pop() || ""

      if (lastPart.length === 1) {
        // Ako je jednocifreni broj, dodaj 0 ispred
        const otherParts = beforeDot.split(".").slice(0, -1)
        value = [...otherParts, "0" + lastPart].join(".") + "."
      }
    }

    // Ograniči dužinu svakog dela
    const segments = value.split(".")
    if (segments[0] && segments[0].length > 2) segments[0] = segments[0].substring(0, 2)
    if (segments[1] && segments[1].length > 2) segments[1] = segments[1].substring(0, 2)
    if (segments[2] && segments[2].length > 4) segments[2] = segments[2].substring(0, 4)
    value = segments.join(".")

    // Auto-format: dodaj tačku nakon 2 cifre (dan) i 2 cifre (mesec)
    const digitsOnly = value.replace(/\./g, "")
    if (digitsOnly.length >= 2 && !value.includes(".")) {
      value = digitsOnly.substring(0, 2) + "." + digitsOnly.substring(2)
    }
    if (digitsOnly.length >= 4 && value.split(".").length === 2) {
      const [day, rest] = value.split(".")
      value = day + "." + rest.substring(0, 2) + "." + rest.substring(2)
    }

    setNewExpiryDate(value)
  }

  const handleDateBlur = () => {
    if (!newExpiryDate) return

    const parts = newExpiryDate.split(".")
    if (parts.length !== 3) return

    let [day, month, year] = parts

    // Dodaj leading zero za jednocifrene dane i mesece
    if (day.length === 1) day = "0" + day
    if (month.length === 1) month = "0" + month

    const formatted = `${day}.${month}.${year}`
    if (formatted !== newExpiryDate) {
      setNewExpiryDate(formatted)
    }
  }

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member)
    const date = new Date(member.expiry_date)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    setNewExpiryDate(`${day}.${month}.${year}`)
  }

  const handleUpdateExpiryDate = async () => {
    if (!editingMember || !newExpiryDate) {
      console.log("[v0] Cannot update - missing data:", {
        hasEditingMember: !!editingMember,
        hasNewExpiryDate: !!newExpiryDate,
      })
      return
    }

    const expiryDateISO = parseDateToISO(newExpiryDate)

    if (!expiryDateISO) {
      toast({
        title: "Грешка",
        description: "Невалидан формат датума. Користите DD.MM.YYYY (нпр. 31.12.2026)",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)

    const requestData = { expiry_date: expiryDateISO }
    const url = `/api/members/${editingMember.id}`

    console.log("[v0] ===== STARTING UPDATE REQUEST =====")
    console.log("[v0] Request details:", {
      memberId: editingMember.id,
      memberName: `${editingMember.first_name} ${editingMember.last_name}`,
      currentExpiryDate: editingMember.expiry_date,
      newExpiryDateDisplay: newExpiryDate,
      newExpiryDateISO: expiryDateISO,
      requestData,
      url,
      method: "PATCH",
    })

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      })

      console.log("[v0] Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
      })

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[v0] Non-JSON response received:", {
          contentType,
          text: text.substring(0, 500),
        })
        throw new Error("Server nije vratio JSON odgovor")
      }

      const data = await response.json()
      console.log("[v0] Response data parsed:", data)

      if (response.ok) {
        console.log("[v0] ===== UPDATE SUCCESSFUL =====")
        toast({
          title: "Успешно ажурирано",
          description: `Датум истека за ${editingMember.first_name} ${editingMember.last_name} је успешно ажуриран на ${newExpiryDate}.`,
        })
        setEditingMember(null)

        setTimeout(() => {
          console.log("[v0] Reloading page to show updated member...")
          window.location.reload()
        }, 1000)
      } else {
        console.error("[v0] ===== UPDATE FAILED =====", data)
        toast({
          title: "Greška",
          description: data.error || data.details || "Došlo je do greške pri ažuriranju datuma.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] ===== UPDATE ERROR =====", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      })
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Došlo je do greške pri ažuriranju datuma.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
      console.log("[v0] ===== UPDATE REQUEST COMPLETE =====")
    }
  }

  const handleDeleteMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Da li ste sigurni da želite da obrišete člana ${memberName}?`)) {
      return
    }

    setDeletingId(memberId)
    try {
      const response = await fetch("/api/members/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })

      if (response.ok) {
        toast({
          title: "Uspešno obrisano",
          description: `Član ${memberName} je uspešno obrisan iz sistema.`,
        })
        if ((window as any).refreshMembers) {
          ;(window as any).refreshMembers()
        }
      } else {
        const data = await response.json()
        toast({
          title: "Greška",
          description: data.error || "Došlo je do greške pri brisanju člana.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting member:", error)
      toast({
        title: "Greška",
        description: "Došlo je do greške pri brisanju člana.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Чланови</h2>
        <span className="text-muted-foreground">{members.length} укупно</span>
      </div>

      <div className="space-y-3">
        {members.map((member) => {
          return (
            <div
              key={member.id}
              className="backdrop-blur-md bg-card/20 border border-primary/20 rounded-lg p-6 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">
                      {member.first_name} {member.last_name}
                    </h3>
                    <span className={`flex items-center gap-1 text-sm ${getStatusColor(member.status)}`}>
                      {getStatusIcon(member.status)}
                      {member.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{member.email}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Истиче:{" "}
                        <span
                          className={
                            isExpiringSoon(member.expiry_date) ? "text-yellow-500 font-semibold" : "text-foreground"
                          }
                        >
                          {formatDate(member.expiry_date)}
                        </span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenEditModal(member)}
                      title="Izmeni datum isteka"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>

                  {isExpiringSoon(member.expiry_date) && member.status === "active" && (
                    <div className="flex items-center gap-2 text-yellow-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Чланарина ускоро истиче!</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMember(member.id, `${member.first_name} ${member.last_name}`)}
                  disabled={deletingId === member.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )
        })}

        {members.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нема регистрованих чланова</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Измени datum истека</DialogTitle>
            <DialogDescription>
              Изаберите нови датум истека чланарине за {editingMember?.first_name} {editingMember?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="expiry-date" className="text-sm font-medium">
                Нови датум истека
              </label>
              <p className="text-xs text-muted-foreground">Унесите датум у формату DD.MM.YYYY (нпр. 31.12.2026)</p>
              <input
                id="expiry-date"
                type="text"
                placeholder="DD.MM.YYYY"
                value={newExpiryDate}
                onChange={handleDateInput}
                onBlur={handleDateBlur}
                maxLength={10}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              />
              {newExpiryDate.length === 10 && parseDateToISO(newExpiryDate) && (
                <p className="text-sm font-medium text-green-600">✓ Валидан датум</p>
              )}
              {newExpiryDate.length === 10 && !parseDateToISO(newExpiryDate) && (
                <p className="text-sm font-medium text-red-600">✗ Невалидан формат</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)} disabled={isUpdating}>
              Откажи
            </Button>
            <Button onClick={handleUpdateExpiryDate} disabled={isUpdating || !newExpiryDate}>
              {isUpdating ? "Чување..." : "Сачувај"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
