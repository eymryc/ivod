"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { BrandLoader, BrandLoaderMark } from "@/components/ui/BrandLoader";
import Link from "next/link";
import { paymentsApi } from "@/lib/api/payments";
import {
  isPaymentCompleted,
  isPaymentFailed,
  paymentStatusCode,
} from "@/lib/utils/payment-status";

function buildNativeDeepLink(paymentRef: string, returnTo?: string | null) {
  const params = new URLSearchParams({ paymentId: paymentRef });
  if (returnTo) params.set("returnTo", returnTo);
  return `ivod://payment/callback?${params.toString()}`;
}

function buildExpoReturnLink(
  appReturn: string,
  paymentRef: string,
  returnTo?: string | null,
): string {
  try {
    const url = new URL(appReturn);
    url.searchParams.set("paymentId", paymentRef);
    if (returnTo) url.searchParams.set("returnTo", returnTo);
    return url.toString();
  } catch {
    return buildNativeDeepLink(paymentRef, returnTo);
  }
}

/**
 * Retour paiement depuis l'app mobile : le navigateur in-app n'a pas le JWT web.
 * Expo Go ne connaît pas ivod:// — on utilise appReturn (exp://…) transmis par l'app.
 */
function MobilePaymentReturn({
  reference,
  returnTo,
  appReturn,
}: {
  reference: string;
  returnTo: string | null;
  appReturn: string | null;
}) {
  const primaryLink = useMemo(
    () =>
      appReturn
        ? buildExpoReturnLink(appReturn, reference, returnTo)
        : buildNativeDeepLink(reference, returnTo),
    [appReturn, reference, returnTo],
  );
  const nativeLink = useMemo(
    () => buildNativeDeepLink(reference, returnTo),
    [reference, returnTo],
  );
  const isExpoGo = primaryLink.startsWith("exp://");

  useEffect(() => {
    window.location.href = primaryLink;
  }, [primaryLink]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center p-8 max-w-md mx-auto">
      <BrandLoaderMark size="md" showTagline={false} />
      <Smartphone className="text-primary" size={36} />
      <h1 className="text-xl font-bold">Retour vers iVOD…</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Votre paiement est terminé. L&apos;application va confirmer votre abonnement.
      </p>
      <p className="text-xs text-white/45 leading-relaxed">
        Si la redirection ne part pas, appuyez sur le bouton ou fermez cette fenêtre (×).
      </p>
      <a
        href={primaryLink}
        className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold"
      >
        Ouvrir iVOD
      </a>
      {!isExpoGo && appReturn ? (
        <a href={nativeLink} className="text-xs text-white/40 underline">
          Lien alternatif (app installée)
        </a>
      ) : null}
    </div>
  );
}

function CallbackRouter() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";
  const isMobileCheckout = searchParams.get("mobile") === "1";
  const returnTo = searchParams.get("returnTo");
  const appReturn = searchParams.get("appReturn");

  if (isMobileCheckout && reference) {
    return (
      <MobilePaymentReturn reference={reference} returnTo={returnTo} appReturn={appReturn} />
    );
  }

  return <WebAuthenticatedCallback />;
}

function WebAuthenticatedCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";
  const isSim = searchParams.get("sim") === "1";
  const returnTo = searchParams.get("returnTo");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!reference) return;
    paymentsApi.syncPayment(reference).catch(() => {});
  }, [reference]);

  const { data: payment, refetch, isError } = useQuery({
    queryKey: ["payment-callback", reference],
    queryFn: () => paymentsApi.getOne(reference),
    enabled: !!reference,
    refetchInterval: (query) => {
      const p = query.state.data;
      if (!p) return 3000;
      const code = paymentStatusCode(p.status);
      if (code === "COMPLETED" || code === "FAILED") return false;
      return pollCount < 40 ? 3000 : false;
    },
  });

  useEffect(() => {
    if (!reference) return;
    const t = setInterval(() => setPollCount((c) => c + 1), 3000);
    return () => clearInterval(t);
  }, [reference]);

  useEffect(() => {
    if (!isPaymentCompleted(payment?.status)) return;
    const t = setTimeout(() => router.push("/settings/subscription?paid=1"), 2500);
    return () => clearTimeout(t);
  }, [payment?.status, router]);

  const [simConfirmed, setSimConfirmed] = useState(false);

  const confirmSimPayment = () => {
    if (!reference) return;
    setSimConfirmed(true);
    paymentsApi.devComplete(reference).then(() => refetch());
  };

  if (isSim && reference && !isPaymentCompleted(payment?.status) && !simConfirmed) {
    return (
      <StatePanel
        icon={<Loader2 size={40} className="text-amber-400" />}
        title="Mode simulation (développement)"
        message="Mode démo : aucun débit réel. Confirmez uniquement pour tester l’activation d’abonnement."
        sub={reference}
        secondaryAction={confirmSimPayment}
        secondaryLabel="Simuler un paiement réussi"
        actionHref="/settings/subscription"
        actionLabel="Annuler"
      />
    );
  }

  if (!reference) {
    return (
      <StatePanel
        icon={<XCircle size={48} className="text-red-400" />}
        title="Référence manquante"
        message="Retournez à la boutique et relancez le paiement."
        actionHref="/settings/subscription"
        actionLabel="Mes abonnements"
      />
    );
  }

  if (isError) {
    return (
      <StatePanel
        icon={<XCircle size={48} className="text-red-400" />}
        title="Paiement introuvable"
        message="Connectez-vous avec le même compte ou contactez le support."
        actionHref="/settings/subscription"
        actionLabel="Réessayer"
      />
    );
  }

  if (!payment) {
    return (
      <StatePanel
        icon={<BrandLoaderMark size="md" showTagline={false} />}
        title="Vérification en cours…"
        message="Nous confirmons votre paiement auprès du prestataire."
      />
    );
  }

  if (isPaymentCompleted(payment.status)) {
    return (
      <StatePanel
        icon={<CheckCircle2 size={48} className="text-green-400" />}
        title="Paiement confirmé"
        message="Votre accès est activé. Redirection automatique…"
        actionHref="/settings/subscription?paid=1"
        actionLabel="Voir mon abonnement"
      />
    );
  }

  if (isPaymentFailed(payment.status)) {
    return (
      <StatePanel
        icon={<XCircle size={48} className="text-red-400" />}
        title="Paiement échoué"
        message="Le paiement n'a pas été validé. Vous pouvez réessayer."
        actionHref="/settings/subscription"
        actionLabel="Réessayer"
        secondaryAction={() => refetch()}
        secondaryLabel="Actualiser"
      />
    );
  }

  return (
    <StatePanel
      icon={<BrandLoaderMark size="md" showTagline={false} />}
      title="Paiement en cours…"
      message="Si vous avez terminé le paiement, patientez quelques secondes."
      secondaryAction={() => refetch()}
      secondaryLabel="Actualiser"
    />
  );
}

function StatePanel({
  icon,
  title,
  message,
  sub,
  actionHref,
  actionLabel,
  secondaryAction,
  secondaryLabel,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  sub?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center p-8 max-w-md mx-auto">
      {icon}
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      {sub && <p className="text-xs font-mono text-white/40 break-all">{sub}</p>}
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold"
          >
            {actionLabel}
          </Link>
        )}
        {secondaryAction && secondaryLabel && (
          <button
            type="button"
            onClick={secondaryAction}
            className="px-6 py-3 border border-white/15 text-sm text-white/80 hover:text-white"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<BrandLoader tagline="Paiement" />}>
      <CallbackRouter />
    </Suspense>
  );
}
