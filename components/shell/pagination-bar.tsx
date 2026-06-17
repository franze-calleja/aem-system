import Link from "next/link";
import { buildPageHref, type Pagination } from "@/lib/pagination";

type Props = {
  pagination: Pagination;
  basePath: string;
  // Current search params (excluding `page`) — used to preserve filters in
  // generated hrefs.
  forwardParams: Record<string, string | string[] | undefined>;
};

export function PaginationBar({ pagination, basePath, forwardParams }: Props) {
  const { page, totalPages, total } = pagination;
  if (totalPages <= 1) {
    return (
      <p className="text-xs text-slate-500">
        {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
      </p>
    );
  }
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages} · {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
      </p>
      <div className="flex items-center gap-2">
        <PageLink
          basePath={basePath}
          forwardParams={forwardParams}
          target={page - 1}
          disabled={page === 1}
        >
          ← Prev
        </PageLink>
        <PageLink
          basePath={basePath}
          forwardParams={forwardParams}
          target={page + 1}
          disabled={page === totalPages}
        >
          Next →
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  basePath,
  forwardParams,
  target,
  disabled,
  children,
}: {
  basePath: string;
  forwardParams: Record<string, string | string[] | undefined>;
  target: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const baseClasses =
    "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]";
  if (disabled) {
    return (
      <span className={`${baseClasses} cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={buildPageHref(basePath, forwardParams, target)}
      className={`${baseClasses} border-slate-300 text-slate-700 hover:bg-slate-50`}
    >
      {children}
    </Link>
  );
}
