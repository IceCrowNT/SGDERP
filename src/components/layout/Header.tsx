"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Bell, Search, User } from "lucide-react"
import { useEffect, useState } from "react"
import { logoutAction } from "@/actions/auth"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10 transition-all duration-300 shadow-sm">
      <div className="flex items-center bg-muted/50 rounded-full px-4 py-2 border border-border/50 focus-within:ring-2 focus-within:ring-primary/50 transition-all w-96">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          type="text" 
          placeholder="Tìm kiếm thông tin..." 
          className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-muted transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )}

        <form action={logoutAction}>
          <button type="submit" className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold shadow-md ml-2 cursor-pointer hover:opacity-90 transition-opacity" title="Đăng xuất">
            <User className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  )
}
