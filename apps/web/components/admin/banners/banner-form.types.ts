export interface BannerFormValues {
  bannerType: "CONTENT" | "EDITORIAL";
  title: string;
  subtitle: string;
  contentId: string;
  linkUrl: string;
  imageObjectKey: string;
  imageObjectKeyMobile: string;
  ctaLabel: string;
  ctaStyle: "PRIMARY" | "GHOST" | "PREMIUM";
  badgeText: string;
  position: number;
  isActive: boolean;
  targetPlanIds: string[];
  countryIds: string[];
  startsAt: string;
  endsAt: string;
}

export interface BannerRecord extends BannerFormValues {
  id: string;
  impressionCount?: number;
  clickCount?: number;
}

export const BANNER_FORM_DEFAULTS: BannerFormValues = {
  bannerType: "EDITORIAL",
  title: "",
  subtitle: "",
  contentId: "",
  linkUrl: "",
  imageObjectKey: "",
  imageObjectKeyMobile: "",
  ctaLabel: "",
  ctaStyle: "PRIMARY",
  badgeText: "",
  position: 1,
  isActive: true,
  targetPlanIds: [],
  countryIds: [],
  startsAt: "",
  endsAt: "",
};

export function bannerToFormValues(banner: Partial<BannerRecord>): BannerFormValues {
  return {
    bannerType: (banner.bannerType as BannerFormValues["bannerType"]) ?? "EDITORIAL",
    title: banner.title ?? "",
    subtitle: banner.subtitle ?? "",
    contentId: banner.contentId ?? "",
    linkUrl: banner.linkUrl ?? "",
    imageObjectKey: banner.imageObjectKey ?? "",
    imageObjectKeyMobile: banner.imageObjectKeyMobile ?? "",
    ctaLabel: banner.ctaLabel ?? "",
    ctaStyle: (banner.ctaStyle as BannerFormValues["ctaStyle"]) ?? "PRIMARY",
    badgeText: banner.badgeText ?? "",
    position: banner.position ?? 1,
    isActive: banner.isActive ?? true,
    targetPlanIds: banner.targetPlanIds ?? [],
    countryIds: banner.countryIds ?? [],
    startsAt: banner.startsAt ? String(banner.startsAt).slice(0, 16) : "",
    endsAt: banner.endsAt ? String(banner.endsAt).slice(0, 16) : "",
  };
}

export function formValuesToPayload(data: BannerFormValues) {
  return {
    ...data,
    contentId: data.contentId || undefined,
    linkUrl: data.linkUrl || undefined,
    ctaLabel: data.ctaLabel || undefined,
    badgeText: data.badgeText || undefined,
    startsAt: data.startsAt || undefined,
    endsAt: data.endsAt || undefined,
    imageObjectKey: data.imageObjectKey || undefined,
    imageObjectKeyMobile: data.imageObjectKeyMobile || undefined,
  };
}
