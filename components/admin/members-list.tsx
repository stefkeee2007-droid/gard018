"use client"

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
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}.`
  }

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member)
    // Convert expiry_date to YYYY-MM-DD format for input
    const date = new Date(member.expiry_date)
    const formattedDate = date.toISOString().split("T")[0]
    setNewExpiryDate(formattedDate)
  }

  const handleUpdateExpiryDate = async () => {
    if (!editingMember || !newExpiryDate) return

    setIsUpdating(true)
    console.log("[v0] Updating expiry date:", { memberId: editingMember.id, newExpiryDate })

    try {
      const response = await fetch(`/api/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry_date: newExpiryDate }),
      })

      console.log("[v0] Response status:", response.status)
      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (response.ok) {
        toast({
          title: "Uspešno ažurirano",
          description: `Datum isteka za ${editingMember.first_name} ${editingMember.last_name} je uspešno ažuriran.`,
        })
        setEditingMember(null)
        window.location.reload()
      } else {
        toast({
          title: "Greška",
          description: data.error || "Došlo je do greške pri ažuriranju datuma.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating expiry date:", error)
      toast({
        title: "Greška",
        description: "Došlo je do greške pri ažuriranju datuma.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
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
              <p className="text-xs text-muted-foreground">Формат: DD.MM.YYYY</p>
              <input
                id="expiry-date"
                type="date"
                lang="sr-RS"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              />
              {newExpiryDate && (
                <p className="text-sm font-medium text-foreground">
                  Изабрани датум: <span className="text-primary">{formatDate(newExpiryDate)}</span>
                </p>
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
