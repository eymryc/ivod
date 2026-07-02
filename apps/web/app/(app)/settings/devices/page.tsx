"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registerCurrentDevice } from "@/lib/hooks/useAuth";
import { Monitor, Smartphone, Tablet, Tv, Loader2, Trash2 } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { devicesApi } from "@/lib/api/devices";
import { ApiError } from "@/lib/api/client";
import { formatRelative } from "@/lib/utils/format";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsList,
  SettingsListRow,
  SettingsEmpty,
} from "@/components/settings/SettingsUI";

function DeviceIcon({ type }: { type: string }) {
  const cls = "text-brand-magenta/80";
  if (type === "MOBILE") return <Smartphone size={22} className={cls} />;
  if (type === "TABLET") return <Tablet size={22} className={cls} />;
  if (type === "TV") return <Tv size={22} className={cls} />;
  if (type === "WEB" || type === "DESKTOP") return <Monitor size={22} className={cls} />;
  return <Monitor size={22} className={cls} />;
}

export default function DevicesPage() {
  const qc = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: devicesApi.list,
    staleTime: 2 * 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: devicesApi.revoke,
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deviceList: any[] = Array.isArray(devices) ? devices : ((devices as unknown as { items?: unknown[] })?.items ?? []);

  useEffect(() => {
    if (!isLoading && deviceList.length === 0) {
      registerCurrentDevice().finally(() => {
        qc.invalidateQueries({ queryKey: ["devices"] });
      });
    }
  }, [isLoading, deviceList.length, qc]);

  return (
    <SettingsPanel>
      <SettingsSectionHeader
        icon={Monitor}
        title="Appareils connectés"
        description="Gérez les appareils qui ont accès à votre compte. Révoquez ceux que vous ne reconnaissez pas."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : deviceList.length === 0 ? (
        <SettingsEmpty
          icon={Monitor}
          title="Aucun appareil"
          description="Les appareils utilisés pour vous connecter apparaîtront ici."
        />
      ) : (
        <SettingsList>
          {deviceList.map((device: any) => (
            <SettingsListRow key={device.id}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-black/25">
                <DeviceIcon type={device.deviceType} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {device.deviceName ?? device.deviceType ?? "Appareil inconnu"}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {device.os && `${device.os} · `}
                  {device.createdAt && `Ajouté ${formatRelative(device.createdAt)} · `}
                  Dernière activité {formatRelative(device.lastSeenAt ?? device.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Révoquer l'accès de "${device.deviceName}" ?`)) {
                    revokeMutation.mutate(device.id);
                  }
                }}
                disabled={revokeMutation.isPending}
                aria-label="Révoquer cet appareil"
                className="ivod-btn flex h-10 w-10 items-center justify-center border border-white/10 text-white/45 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
              >
                {revokeMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            </SettingsListRow>
          ))}
        </SettingsList>
      )}
    </SettingsPanel>
  );
}
