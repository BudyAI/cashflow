'use client'
import { signOut } from 'next-auth/react'
import Image from 'next/image'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-4">
      <div className="flex items-center gap-3">
        {user.image && (
          <Image
            src={user.image}
            alt={user.name ?? 'User'}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <div className="text-sm">
          <p className="font-medium text-slate-900">{user.name}</p>
          <p className="text-slate-500 text-xs">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs text-slate-500 hover:text-slate-700 ml-2"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
