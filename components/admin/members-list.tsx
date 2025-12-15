"use client"

import { Calendar, Mail, User, AlertCircle, CheckCircle } from "lucide-react"

interface Member {
  id: number
  first_name: string
  last_name: string
  email: string
  start_date: string
  expiry_date: string
  status: string
  created_at: string
}

export function MembersList({ members }: { members: Member[] }) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Чланови</h2>
        <span className="text-muted-foreground">{members.length} укупно</span>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="backdrop-blur-md bg-card/20 border border-primary/20 rounded-lg p-6 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
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

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Почетак:{" "}
                      <span className="text-foreground">{new Date(member.start_date).toLocaleDateString("sr-RS")}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Истиче:{" "}
                      <span
                        className={
                          isExpiringSoon(member.expiry_date) ? "text-yellow-500 font-semibold" : "text-foreground"
                        }
                      >
                        {new Date(member.expiry_date).toLocaleDateString("sr-RS")}
                      </span>
                    </span>
                  </div>
                </div>

                {isExpiringSoon(member.expiry_date) && member.status === "active" && (
                  <div className="flex items-center gap-2 text-yellow-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Чланарина ускоро истиче!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Нема регистрованих чланова</p>
          </div>
        )}
      </div>
    </div>
  )
}
