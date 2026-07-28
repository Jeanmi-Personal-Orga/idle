import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { C, S } from './theme';

/**
 * Les quelques briques d'interface que tous les écrans réutilisent.
 *
 * En web, `<button>`, `<div class="card">` et une feuille de style suffisaient.
 * React Native n'a ni cascade ni éléments sémantiques : ces composants tiennent
 * le rôle des classes CSS de l'ancienne version.
 */

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[S.card, style]}>{children}</View>;
}

export function Row({
  children,
  between,
  style,
}: {
  children: ReactNode;
  /** Répartit les enfants aux deux bords, comme `.row.between` en CSS. */
  between?: boolean;
  style?: ViewStyle;
}) {
  return <View style={[S.row, between && S.between, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={S.label}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[S.muted, S.small, style]}>{children}</Text>;
}

/**
 * Bouton. `tone` remplace les variantes CSS : `ghost` sans fond, `primary` pour
 * les gestes qui engagent (dissoudre, partir en mission, payer).
 */
export function Button({
  children,
  onPress,
  disabled,
  tone = 'normal',
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'normal' | 'ghost' | 'primary';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        S.button,
        tone === 'ghost' && S.buttonGhost,
        tone === 'primary' && S.buttonPrimary,
        // Pas de `:active` en natif : l'enfoncement se joue à la main.
        pressed && !disabled && { transform: [{ translateY: 1 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[S.buttonText, tone === 'primary' && S.buttonTextPrimary]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/** Barre de remplissage, pour la vie comme pour l'avancement d'une mission. */
export function Bar({ ratio, color }: { ratio: number; color: string }) {
  const pct = `${Math.max(0, Math.min(1, ratio)) * 100}%` as const;
  return (
    <View style={S.bar}>
      <View style={[S.barFill, { width: pct, backgroundColor: color }]} />
    </View>
  );
}

/**
 * Fenêtre modale. En web c'était un `.modal-overlay` cliquable ; ici on garde le
 * même geste — toucher le fond referme — avec le `Modal` natif, qui gère le
 * bouton retour d'Android.
 */
export function Popup({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(10, 12, 18, 0.6)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {/* Le contenu absorbe le toucher : sans ça, chaque geste dedans fermerait. */}
        <Pressable onPress={() => {}} style={{ maxHeight: '85%' }}>
          <View style={[S.card, { maxWidth: 420, width: '100%', alignSelf: 'center' }]}>
            <Row between>
              <Label>{title}</Label>
              <Button tone="ghost" onPress={onClose}>
                <Text style={{ color: C.muted, fontSize: 16 }}>✕</Text>
              </Button>
            </Row>
            <ScrollView contentContainerStyle={{ gap: 10 }}>{children}</ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
