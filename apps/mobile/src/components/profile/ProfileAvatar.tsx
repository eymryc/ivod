import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Shield } from "lucide-react-native";
import { assetUrl } from "@/utils/assets";
import { colors } from "@/theme/colors";
import { profileAvatarGradient } from "./profile-avatar-theme";

type ProfileAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  isActive?: boolean;
  isKids?: boolean;
  hasPin?: boolean;
  showCheck?: boolean;
  variant?: "circle" | "rect";
  forceInitial?: boolean;
};

export function ProfileAvatar({
  name,
  avatarUrl,
  size = 72,
  isActive,
  isKids,
  hasPin,
  showCheck,
  variant = "circle",
  forceInitial = false,
}: ProfileAvatarProps) {
  const uri = forceInitial ? null : assetUrl(avatarUrl);
  const [c1, c2] = profileAvatarGradient(name);
  const ring = size + 6;
  const letterSize = Math.round(size * 0.38);
  const radius = variant === "rect" ? 0 : size / 2;

  return (
    <View style={[styles.wrap, { width: ring, height: ring }]}>
      {isActive ? (
        <LinearGradient
          colors={[colors.magenta, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.ring,
            { width: ring, height: ring, borderRadius: variant === "rect" ? 0 : ring / 2 },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          isKids && styles.avatarKids,
          !isActive && styles.avatarIdle,
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
        ) : (
          <LinearGradient
            colors={[c1, c2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject,
              { borderRadius: radius, alignItems: "center", justifyContent: "center" },
            ]}
          >
            {/** En rectangle, on garde toujours l’initiale au centre (même actif). */}
            {showCheck && isActive && variant !== "rect" ? (
              <Check color="#fff" size={letterSize} strokeWidth={2.5} />
            ) : (
              <Text style={[styles.letter, { fontSize: letterSize }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </LinearGradient>
        )}
        {/** En rectangle : badge ✅ discret au lieu de remplacer la lettre. */}
        {showCheck && isActive && variant === "rect" ? (
          <View style={styles.activeBadge}>
            <Check color="#fff" size={14} strokeWidth={2.5} />
          </View>
        ) : null}
        {showCheck && isActive && uri ? (
          <View style={styles.checkOverlay}>
            <Check color="#fff" size={22} strokeWidth={2.5} />
          </View>
        ) : null}
        {isKids ? (
          <View style={styles.kidsBadge}>
            <Text style={styles.kidsText}>Kids</Text>
          </View>
        ) : null}
      </View>
      {hasPin ? (
        <View style={styles.pinBadge}>
          <Shield color={colors.gold} size={11} strokeWidth={2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    opacity: 0.95,
  },
  avatar: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.backgroundElevated,
  },
  avatarIdle: {
    borderColor: "rgba(255,255,255,0.14)",
  },
  avatarKids: {
    borderColor: "rgba(56,189,248,0.45)",
  },
  letter: { fontWeight: "800", color: "#fff" },
  activeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.35)",
    backgroundColor: "rgba(0,5,13,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(123,0,153,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  kidsBadge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(14,165,233,0.92)",
    paddingVertical: 2,
    alignItems: "center",
  },
  kidsText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },
  pinBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(0,5,13,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
