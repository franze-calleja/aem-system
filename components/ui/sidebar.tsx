'use client';

import Link from "next/link";
import {
  createContext,
  type ComponentProps,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((current) => !current),
    }),
    [open],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}

export function Sidebar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useSidebar();

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/30 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20",
          className,
        )}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-b border-slate-200 p-4", className)}>{children}</div>;
}

export function SidebarFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-t border-slate-200 p-4", className)}>{children}</div>;
}

export function SidebarContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-y-auto p-4", className)}>{children}</div>;
}

export function SidebarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("mb-6", className)}>{children}</section>;
}

export function SidebarGroupLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500", className)}>
      {children}
    </p>
  );
}

export function SidebarMenu({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-1", className)}>{children}</div>;
}

export function SidebarMenuItem({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

type SidebarMenuButtonProps = {
  active?: boolean;
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"button">, "children">;

export function SidebarMenuButton({
  active,
  href,
  children,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const sharedClassName = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
    active
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    className,
  );

  if (href) {
    return (
      <Link className={sharedClassName} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={sharedClassName} type="button" {...props}>
      {children}
    </button>
  );
}

export function SidebarInset({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1", className)}>{children}</div>;
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggle } = useSidebar();

  return (
    <button
      aria-label="Toggle sidebar"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100",
        className,
      )}
      onClick={toggle}
      type="button"
    >
      <span className="text-lg leading-none">≡</span>
    </button>
  );
}

export function SidebarRail() {
  return <div className="w-px bg-slate-200" aria-hidden="true" />;
}