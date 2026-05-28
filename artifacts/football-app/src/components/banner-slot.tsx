import { useListBanners } from "@workspace/api-client-react";

export function BannerSlot({ position }: { position: "top_home" | "top_live" }) {
  const { data: banners } = useListBanners({ position });

  const active = banners?.filter(b => b.isActive && b.position === position) ?? [];
  if (active.length === 0) return null;

  const banner = active[0];

  const inner = (
    <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-border/40 shadow-sm">
      <img
        src={banner.imageUrl}
        alt="Advertisement"
        className="w-full object-cover max-h-20"
        onError={e => { (e.currentTarget.parentElement as HTMLElement | null)?.remove(); }}
      />
    </div>
  );

  if (banner.linkUrl) {
    return (
      <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return inner;
}
