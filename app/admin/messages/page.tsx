"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AdminGuard } from "@/components/admin/admin-guard"
import { MessageSquare, Mail, Phone, Clock, Check } from "lucide-react"

type Message = {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  status: string
  created_at: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/messages")
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "read" }),
      })
      fetchMessages()
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-background py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground">Učitavanje poruka...</p>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Poruke korisnika</h1>
            <p className="text-muted-foreground">Prikaz svih poruka primljenih preko kontakt forme</p>
          </div>

          {messages.length === 0 ? (
            <div className="bg-card/50 backdrop-blur-sm border border-primary/10 rounded-sm p-12 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Trenutno nema novih poruka</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`bg-card/50 backdrop-blur-sm border rounded-sm p-6 ${
                    msg.status === "unread" ? "border-primary/30" : "border-primary/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-foreground">{msg.name}</h3>
                        {msg.status === "unread" && (
                          <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded uppercase tracking-wider">
                            Nepročitano
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {msg.email}
                        </div>
                        {msg.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {msg.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(msg.created_at).toLocaleString("sr-RS")}
                        </div>
                      </div>
                    </div>
                    {msg.status === "unread" && (
                      <Button
                        onClick={() => markAsRead(msg.id)}
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/10"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Označi kao pročitano
                      </Button>
                    )}
                  </div>
                  <div className="bg-background/50 rounded-sm p-4 border border-primary/10">
                    <p className="text-foreground whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
