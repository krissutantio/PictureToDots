import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
export function StepPanel({
  step,
  title,
  active,
  onOpen,
  children,
}: {
  step: number;
  title: string;
  active: number;
  onOpen: (step: number) => void;
  children: ReactNode;
}) {
  const open = step === active;
  return (
    <section className={`workflow-step ${open ? "is-open" : ""}`}>
      <button
        className="step-toggle"
        aria-expanded={open}
        aria-controls={`step-content-${step}`}
        onClick={() => onOpen(open ? 0 : step)}
      >
        <span className="step">{String(step).padStart(2, "0")}</span>
        <strong>{title}</strong>
        <ChevronRight size={15} />
      </button>
      <div className="step-content" id={`step-content-${step}`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
