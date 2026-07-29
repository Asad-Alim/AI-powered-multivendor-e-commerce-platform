'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('intellimart-theme')
        if (saved === 'dark') {
            setIsDark(true)
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev
            if (next) {
                document.documentElement.classList.add('dark')
                localStorage.setItem('intellimart-theme', 'dark')
            } else {
                document.documentElement.classList.remove('dark')
                localStorage.setItem('intellimart-theme', 'light')
            }
            return next
        })
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
