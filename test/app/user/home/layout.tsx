import UserShell from '@/app/components/UserShell'

export default function UserHomeLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>
}
