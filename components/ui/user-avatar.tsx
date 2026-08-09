export function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <span className={`user-avatar user-avatar-${size}`} aria-hidden="true">{initials}</span>;
}
