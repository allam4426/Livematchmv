import { cn } from "@/lib/utils";

export function LivePulse({ className, text = "LIVE" }: { className?: string, text?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </div>
      <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{text}</span>
    </div>
  );
}
