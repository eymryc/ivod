/**
 * ErrorBoundary — Capture les erreurs de rendu React non gérées.
 *
 * Empêche l'app de crasher silencieusement sur une erreur de render.
 * Affiche une UI de fallback avec la possibilité de recharger.
 *
 * À placer le plus haut possible dans l'arbre de composants (app/_layout.tsx).
 *
 * Note : Les Error Boundaries doivent être des class components (limitation React).
 */

import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface Props {
  children: ReactNode;
  /** UI de fallback personnalisée. Reçoit l'erreur et un callback reset. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Point d'intégration Sentry / logging service
    console.error('[ErrorBoundary] Erreur non gérée :', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset);
    }

    return <DefaultFallback error={this.state.error} onReset={this.reset} />;
  }
}

// ─── Fallback par défaut ───────────────────────────────────────────────────

interface DefaultFallbackProps {
  error: Error;
  onReset: () => void;
}

function DefaultFallback({ error, onReset }: DefaultFallbackProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Une erreur inattendue s'est produite</Text>
      <Text style={styles.message}>{error.message}</Text>
      <TouchableOpacity style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.magenta,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
