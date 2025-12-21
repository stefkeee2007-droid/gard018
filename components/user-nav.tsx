"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, UserIcon, Users, Shield, MessageSquare, Calendar, AlertCircle } from "lucide-react"

type User = {
  email: string
  name: string
  image: string
}

type Membership = {
  id: number
  first_name: string
  last_name: string
  email: string
  start_date: string
  expiry_date: string
  status: string
}

export function UserNav() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then((res) => res.json()),
      fetch("/api/auth/check-admin").then((res) => res.json()),
      fetch("/api/members/by-email").then((res) => res.json()),
    ])
      .then(([sessionData, adminData, membershipData]) => {
        setUser(sessionData.user || null)
        setIsAdmin(adminData.isAdmin || false)
        setMembership(membershipData.membership || null)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Session fetch error:", error)
        setIsLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    window.location.href = "/"
  }

  const getDaysUntilExpiry = () => {
    if (!membership || !membership.expiry_date) return null
    const today = new Date()
    const expiry = new Date(membership.expiry_date)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysLeft = getDaysUntilExpiry()
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
  const isExpired = daysLeft !== null && daysLeft < 0

  if (isLoading) {
    return <div className="w-10 h-10" />
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/prijava"
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
        >
          Prijava
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href="/registracija"
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
        >
          Registracija
        </Link>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary hover:border-primary/70 transition-colors">
          {user.image ? (
            <Image src={user.image || "/placeholder.svg"} alt={user.name || "User"} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          {(isExpiringSoon || isExpired) && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-foreground text-background border-border shadow-lg">
        <DropdownMenuLabel className="text-background">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-background/20" />
        <DropdownMenuItem
          className="text-background hover:bg-background/20 cursor-pointer"
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Podešavanja
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="bg-background/20" />
            <DropdownMenuItem
              className="text-background hover:bg-background/20 cursor-pointer"
              onClick={() => router.push("/admin")}
            >
              <Users className="mr-2 h-4 w-4" />
              Pregled članarina
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-background hover:bg-background/20 cursor-pointer"
              onClick={() => router.push("/admin/messages")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Poruke korisnika
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-background hover:bg-background/20 cursor-pointer"
              onClick={() => router.push("/admin/manage-admins")}
            >
              <Shield className="mr-2 h-4 w-4" />
              Upravljaj adminima
            </DropdownMenuItem>
          </>
        )}
        {membership && (
          <>
            <DropdownMenuSeparator className="bg-background/20" />
            <div className="px-2 py-3">
              <div className="flex items-start gap-2 text-xs">
                <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-white">Članarina</p>
                  {isExpired ? (
                    <p className="text-red-500 font-semibold mt-1">Istekla!</p>
                  ) : isExpiringSoon ? (
                    <p className="text-yellow-500 font-semibold mt-1">
                      Ističe za {daysLeft} {daysLeft === 1 ? "dan" : "dana"}
                    </p>
                  ) : daysLeft !== null ? (
                    <p className="text-muted-foreground mt-1">
                      Ističe {new Date(membership.expiry_date).toLocaleDateString("sr-RS")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-1">Nema podataka</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        <DropdownMenuSeparator className="bg-background/20" />
        <DropdownMenuItem className="text-background hover:bg-background/20 cursor-pointer" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Odjavi se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
