import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="mb-7 flex items-start justify-between gap-6">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[34px] font-extrabold leading-tight tracking-normal text-text-heading">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-secondary">{description}</p>
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </div>
  );
}

