"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shield, Mail, Trash2, Download, Loader2, CheckCircle2, Wifi, AlertCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUIStore } from "@/lib/stores/ui.store";
import { ApiError } from "@/lib/api/client";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsPrimaryButton,
  SettingsGhostButton,
  SettingsToggleRow,
  SETTINGS_INPUT_CLASS,
} from "@/components/settings/SettingsUI";

export default function PrivacyPage() {
  const { logout } = useAuth();
  const { dataSaver, setDataSaver } = useUIStore();
  const [emailMarketing, setEmailMarketing] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: usersApi.getPreferences,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!prefs) return;
    setEmailMarketing(prefs.emailMarketing);
    setEmailNotifications(prefs.emailNotifications);
  }, [prefs]);

  const updatePrefsMutation = useMutation({
    mutationFn: usersApi.updatePreferences,
    onSuccess: () => toast.success("Préférences enregistrées"),
    onError: (err: ApiError) => showApiError(err),
  });

  const exportMutation = useMutation({
    mutationFn: usersApi.requestDataExport,
    onSuccess: (data) => showApiSuccess(data),
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: usersApi.deleteAccount,
    onSuccess: (data) => {
      showApiSuccess(data);
      logout();
    },
    onError: (err: ApiError) => showApiError(err),
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <SettingsPanel>
        <SettingsSectionHeader
          icon={Shield}
          title="Confidentialité & données"
          description="Gérez vos données personnelles conformément au RGPD et aux lois de protection des données."
        />

        <div className="space-y-3 mb-6">
          <h3 className="text-caption font-semibold text-secondary-token flex items-center gap-2">
            <Mail size={14} /> Communications email
          </h3>
          <SettingsToggleRow
            title="Notifications de compte"
            description="Confirmations de paiement, activité sécurité, nouvelles fonctionnalités."
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <SettingsToggleRow
            title="Emails marketing"
            description="Nouvelles sorties, recommandations personnalisées, offres promotionnelles."
            checked={emailMarketing}
            onChange={setEmailMarketing}
          />
        </div>

        <SettingsPrimaryButton
          disabled={updatePrefsMutation.isPending || prefsLoading}
          onClick={() => updatePrefsMutation.mutate({ emailMarketing, emailNotifications })}
        >
          {updatePrefsMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          Enregistrer les préférences
        </SettingsPrimaryButton>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsSectionHeader
          icon={Wifi}
          title="Qualité vidéo & données mobiles"
          description="Réduisez la consommation de données sur réseau mobile."
        />
        <SettingsToggleRow
          title="Mode économie de données"
          description="Force la qualité 480p (SD). Recommandé sur réseau 3G."
          checked={dataSaver}
          onChange={setDataSaver}
        >
          {dataSaver && (
            <p className="text-xs text-brand-magenta font-medium mt-2">Actif — qualité limitée à 480p</p>
          )}
        </SettingsToggleRow>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsSectionHeader
          icon={Download}
          title="Vos données personnelles"
          description="Demandez un export de toutes les données que nous détenons sur vous (sous 24 h par email)."
        />
        <SettingsGhostButton disabled={exportMutation.isPending || exportMutation.isSuccess} onClick={() => exportMutation.mutate()}>
          {exportMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {exportMutation.isSuccess ? "Demande envoyée" : "Exporter mes données"}
        </SettingsGhostButton>
      </SettingsPanel>

      <SettingsPanel className="border-red-500/20">
        <SettingsSectionHeader
          icon={Trash2}
          title="Supprimer mon compte"
          description="Action irréversible — historique, favoris, abonnement et profils seront supprimés."
        />

        {!confirmDelete ? (
          <SettingsGhostButton danger onClick={() => setConfirmDelete(true)}>
            Demander la suppression du compte
          </SettingsGhostButton>
        ) : (
          <div className="space-y-4 p-5 border border-red-500/30 bg-red-500/[0.06]">
            <p className="text-sm text-red-200">
              Tapez <strong className="text-white">SUPPRIMER</strong> pour confirmer :
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="SUPPRIMER"
              className={`${SETTINGS_INPUT_CLASS} border-red-500/30 focus:border-red-500/50`}
            />
            <div className="flex flex-wrap gap-3">
              <SettingsGhostButton onClick={() => { setConfirmDelete(false); setDeleteInput(""); }}>
                Annuler
              </SettingsGhostButton>
              <button
                type="button"
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteInput !== "SUPPRIMER" || deleteAccountMutation.isPending}
                className="ivod-btn inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40"
              >
                {deleteAccountMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        )}
      </SettingsPanel>

      <div className="flex items-start gap-3 p-4 border border-white/[0.06] bg-white/[0.02] text-xs text-white/45">
        <AlertCircle size={16} className="shrink-0 text-brand-gold mt-0.5" />
        <p>
          Pour toute question sur vos données, contactez le support iVOD. Vous pouvez retirer votre consentement
          marketing à tout moment.
        </p>
      </div>
    </div>
  );
}
