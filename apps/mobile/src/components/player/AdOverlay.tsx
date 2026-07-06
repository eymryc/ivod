import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { X, Sparkles, ExternalLink } from "lucide-react-native";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

export interface AdConfig {
  id?: string;
  adId?: string;
  /** "video" | "image" | "branded" */
  type?: string;
  url?: string;
  link?: string;
  skipAfter?: number;
  message?: string;
}

interface Props {
  ad: AdConfig;
  onComplete: () => void;
}

// ─── AdBadge ────────────────────────────────────────────────────────────────

function AdBadge() {
  return (
    <View style={badge.wrap}>
      <Sparkles color={colors.gold} size={10} />
      <Text style={badge.text}>Publicité</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  text: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 0.8 },
});

// ─── SkipProgressRing ────────────────────────────────────────────────────────

function SkipProgressRing({ remaining, total, size = 40 }: { remaining: number; total: number; size?: number }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 1;
  const offset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Defs>
        <SvgGradient id="skip-ring" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={colors.purple} />
          <Stop offset="45%" stopColor={colors.magenta} />
          <Stop offset="100%" stopColor={colors.gold} />
        </SvgGradient>
      </Defs>
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2}
      />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="url(#skip-ring)" strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

// ─── SkipButton ──────────────────────────────────────────────────────────────

function SkipButton({ canSkip, remaining, skipAfter, onSkip }: {
  canSkip: boolean;
  remaining: number;
  skipAfter: number;
  onSkip: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={canSkip ? onSkip : undefined}
      disabled={!canSkip}
      style={[skip.btn, canSkip && skip.btnReady]}
      activeOpacity={canSkip ? 0.85 : 1}
      accessibilityRole="button"
      accessibilityLabel={canSkip ? "Passer la publicité" : `Passer dans ${remaining}s`}
    >
      {!canSkip && skipAfter > 0 && (
        <SkipProgressRing remaining={remaining} total={skipAfter} size={34} />
      )}
      {canSkip ? (
        <>
          <X color="#fff" size={14} strokeWidth={2.5} />
          <Text style={skip.label}>Passer la pub</Text>
        </>
      ) : (
        <Text style={[skip.label, skip.labelMuted]}>{remaining}s</Text>
      )}
    </TouchableOpacity>
  );
}

const skip = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  btnReady: {
    borderColor: colors.magenta,
    backgroundColor: "rgba(230,0,126,0.18)",
  },
  label: { color: "#fff", fontWeight: "700", fontSize: 13 },
  labelMuted: { color: "rgba(255,255,255,0.55)", fontVariant: ["tabular-nums"] },
});

// ─── BrandedAd ───────────────────────────────────────────────────────────────

function BrandedAd({ message, onComplete, skipAfter = 5 }: {
  message?: string;
  onComplete: () => void;
  skipAfter?: number;
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(skipAfter);
  const completedRef = useRef(false);

  useEffect(() => {
    setRemaining(skipAfter);
    completedRef.current = false;
  }, [skipAfter]);

  useEffect(() => {
    if (!skipAfter) return;
    if (remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, skipAfter, onComplete]);

  const progress = skipAfter > 0 ? Math.min(100, ((skipAfter - remaining) / skipAfter) * 100) : 100;

  return (
    <View style={branded.root}>
      {/* Background vignette */}
      <View style={branded.bg} pointerEvents="none" />

      {/* Top accent line (brand gradient) */}
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={branded.topLine}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={branded.topBar}>
        <AdBadge />
      </View>

      {/* Card with gradient border */}
      <View style={branded.cardWrap}>
        <LinearGradient
          colors={[colors.purple, colors.magenta, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={branded.cardBorder}
        >
          <View style={branded.card}>
            {/* Accent line */}
            <LinearGradient
              colors={[...gradients.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={branded.cardAccent}
            />

            {/* Logo */}
            <View style={branded.logoWrap}>
              <Image
                source={require("../../../assets/logo/logo_sans_fond.png")}
                style={branded.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={branded.kicker}>Avant la lecture</Text>
            <Text style={branded.title}>Un instant de publicité</Text>
            <Text style={branded.msg}>
              {message ??
                "Ce programme est proposé gratuitement grâce à la publicité.\nPassez à un abonnement pour regarder sans interruption."}
            </Text>

            {skipAfter > 0 && (
              <View style={branded.countdown}>
                <View style={branded.countdownRow}>
                  <SkipProgressRing remaining={remaining} total={skipAfter} size={44} />
                  <Text style={branded.countdownText}>
                    Lecture dans{" "}
                    <Text style={branded.countdownNum}>{remaining}s</Text>
                  </Text>
                </View>
                <View style={branded.progressTrack}>
                  <LinearGradient
                    colors={[...gradients.brand]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[branded.progressFill, { width: `${progress}%` }]}
                  />
                </View>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={branded.ctaWrap}
              onPress={() => router.push("/settings/subscription" as never)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Regarder sans publicité"
            >
              <LinearGradient
                colors={[...gradients.primaryBtn]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={branded.cta}
              >
                <Text style={branded.ctaText}>Regarder sans pub</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const branded = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000308",
    zIndex: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,3,8,0.7)",
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 5,
  },
  topBar: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  cardWrap: { width: "90%", maxWidth: 380, zIndex: 10 },
  cardBorder: { padding: 1 },
  card: {
    backgroundColor: "#070b15",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  cardAccent: { height: 2, width: "100%", marginBottom: 20 },
  logoWrap: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: "rgba(230,0,126,0.06)",
    borderRadius: 0,
  },
  logo: { width: 120, height: 48 },
  kicker: { ...typography.kicker, marginBottom: 4 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  msg: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  countdown: { width: "100%", alignItems: "center", gap: 10, marginBottom: 16 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  countdownText: { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  countdownNum: { fontWeight: "800", color: colors.gold, fontVariant: ["tabular-nums"] },
  progressTrack: {
    width: "100%",
    maxWidth: 240,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  ctaWrap: { width: "100%", marginTop: 4 },
  cta: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});

// ─── AdChrome (image ads) ────────────────────────────────────────────────────

function ImageAd({ ad, onComplete }: { ad: AdConfig; onComplete: () => void }) {
  const skipAfter = ad.skipAfter ?? 5;
  const [remaining, setRemaining] = useState(skipAfter);
  const [canSkip, setCanSkip] = useState(skipAfter === 0);

  useEffect(() => {
    if (skipAfter <= 0) { setCanSkip(true); return; }
    if (remaining <= 0) { setCanSkip(true); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, skipAfter]);

  return (
    <View style={chrome.root}>
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={chrome.topLine}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={chrome.topBar}>
        <AdBadge />
        {ad.link ? (
          <TouchableOpacity
            style={chrome.learnMore}
            onPress={() => { /* deep link or open browser — LinkingModule */ }}
            accessibilityRole="button"
            accessibilityLabel="En savoir plus"
          >
            <ExternalLink color="rgba(255,255,255,0.55)" size={12} />
            <Text style={chrome.learnText}>En savoir plus</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Media */}
      <View style={chrome.mediaFrame}>
        {ad.url ? (
          <Pressable onPress={() => { /* open ad.link */ }}>
            <Image
              source={{ uri: ad.url }}
              style={chrome.media}
              resizeMode="contain"
            />
          </Pressable>
        ) : null}
      </View>

      {/* Footer */}
      <View style={chrome.footer}>
        <SkipButton
          canSkip={canSkip}
          remaining={remaining}
          skipAfter={skipAfter}
          onSkip={onComplete}
        />
      </View>
    </View>
  );
}

const chrome = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000308",
    zIndex: 30,
    justifyContent: "space-between",
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 5,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    zIndex: 10,
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  learnText: { fontSize: 11, color: "rgba(255,255,255,0.55)" },
  mediaFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  media: { width: "100%", height: "100%", maxHeight: 320 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
});

// ─── AdOverlay (root) ────────────────────────────────────────────────────────

export function AdOverlay({ ad, onComplete }: Props) {
  const isBranded = ad.type === "branded" || !ad.url || ad.type === "video";

  if (isBranded) {
    return (
      <BrandedAd
        message={ad.message}
        onComplete={onComplete}
        skipAfter={ad.skipAfter ?? 5}
      />
    );
  }

  return <ImageAd ad={ad} onComplete={onComplete} />;
}
