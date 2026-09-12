import { Inbox, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden />
      <p className="mt-3 text-sm font-medium">Terjadi kesalahan. Silakan coba lagi.</p>
      {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
