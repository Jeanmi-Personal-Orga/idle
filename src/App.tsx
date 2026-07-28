import { useEffect, useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNum } from './game/engine';
import { heroStats, powerScore } from './game/formulas';
import { RESOURCES, type ResourceId } from './game/resources';
import { ResourceTicker } from './ui/ResourceTicker';
import { useGame, useGameLoop } from './game/store';
import { hydrate } from './game/storage';
import { BrumeView } from './ui/BrumeView';
import { TechView } from './ui/TechView';
import { CampaignView } from './ui/CampaignView';
import { AscendView } from './ui/AscendView';
import { ShopView } from './ui/Shop';
import { CharacterSelect } from './ui/CharacterSelect';
import { AuthScreen } from './ui/AuthScreen';
import { hasUnlockedAscension, shardGain } from './game/ascension';
import { authStore, hasSkippedAuth, useAuth } from './game/auth';
import type { GameState } from './game/types';
import { C, S } from './ui/theme';
import { Button } from './ui/kit';

type Tab = 'brume' | 'camp' | 'tech' | 'shop' | 'ascend';

// Brume au centre : c'est l'onglet où l'on passe le plus de temps, donc celui qui
// doit tomber sous le pouce.
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shop', label: 'Boutique', icon: '💰' },
  { id: 'camp', label: 'Campagnes', icon: '🗺' },
  { id: 'brume', label: 'Brume', icon: '☁' },
  { id: 'tech', label: 'Recherche', icon: '◇' },
  { id: 'ascend', label: 'Dissolution', icon: '★' },
];

/**
 * Les ressources tardives ne s'affichent qu'une fois obtenues : un débutant n'a pas
 * à se demander à quoi servent des reliques qu'il ne verra pas avant des heures.
 */
function visibleResource(state: GameState, id: ResourceId): boolean {
  if (id === 'shard') return state.resources.shard > 0 || state.ascension.count > 0;
  if (id === 'catalyst') return state.resources.catalyst > 0;
  return true;
}

/**
 * Racine de l'application.
 *
 * Le stockage natif étant asynchrone, on l'attend avant de rendre quoi que ce soit
 * (`hydrate`) : sans ça, le premier rendu se ferait sur une partie vierge et
 * écraserait la sauvegarde de l'appareil.
 */
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrate().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={[S.screen, { alignItems: 'center', justifyContent: 'center' }]}>
          <StatusBar barStyle="light-content" />
          <Text style={S.muted}>La brume se lève…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

/**
 * Cadre d'écran : applique les marges système à la main. `SafeAreaView` aurait
 * suffi, mais son composant manque au mock de test — et un simple `View` avec les
 * encoches en padding se teste sans rien simuler.
 */
function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[S.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );
}

function Game() {
  useGameLoop();
  const state = useGame();
  const session = useAuth();
  const [tab, setTab] = useState<Tab>('brume');
  // Un saut explicite tient jusqu'au relancement ; se reconnecter (via le bouton
  // d'en-tête) rouvre l'écran sans attendre.
  const [authDismissed, setAuthDismissed] = useState(() => hasSkippedAuth());
  const [showAuth, setShowAuth] = useState(false);

  // Écran de connexion d'abord (sauf déjà connecté ou déjà sauté) : une sauvegarde
  // cloud existante doit primer sur l'écran de choix de personnage, pas l'inverse.
  if ((!session && !authDismissed) || showAuth) {
    return (
      <Screen>
        <AuthScreen
          onDone={() => {
            setAuthDismissed(true);
            setShowAuth(false);
          }}
        />
      </Screen>
    );
  }

  // Première chose que voit un nouveau joueur : qui il incarne.
  if (!state.character) {
    return (
      <Screen>
        <CharacterSelect />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={[S.row, S.between]}>
          <Text style={{ color: C.fg, fontSize: 14, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
            L'Alchimiste de Brume
          </Text>
          {/* La puissance totale se lit à côté du compte : c'est le résumé de tout
              ce qu'on possède, pas une donnée de combat. */}
          <Text style={{ color: C.catalyst, fontWeight: '700', fontSize: 13 }}>
            ★ {formatNum(powerScore(heroStats(state)))}
          </Text>
          {session ? (
            <View style={[S.row, { gap: 6 }]}>
              <Text style={[S.muted, S.small]} numberOfLines={1}>
                {session.user.username}
              </Text>
              <Button tone="ghost" onPress={() => authStore.logout()}>
                <Text style={[S.muted, S.small]}>Sortir</Text>
              </Button>
            </View>
          ) : (
            <Button tone="ghost" onPress={() => setShowAuth(true)}>
              <Text style={[S.muted, S.small]}>Se connecter</Text>
            </Button>
          )}
        </View>

        {/* Une seule source de vérité pour les ressources : leur nom, leur icône et
            ce à quoi elles servent viennent de `resources.ts`. */}
        <View style={[S.row, S.between, { flexWrap: 'wrap', rowGap: 4 }]}>
          {RESOURCES.filter((r) => visibleResource(state, r.id)).map((r) => (
            <ResourceTicker key={r.id} id={r.id} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'brume' && <BrumeView />}
        {tab === 'camp' && <CampaignView />}
        {tab === 'tech' && <TechView />}
        {tab === 'shop' && <ShopView />}
        {tab === 'ascend' && <AscendView />}
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: C.line,
          backgroundColor: '#10161f',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const badge = t.id === 'ascend' && hasUnlockedAscension(state) && shardGain(state) > 0;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 }}
            >
              <Text style={{ fontSize: 16, color: active ? C.fg : C.muted }}>{t.icon}</Text>
              <Text style={{ fontSize: 10.5, color: active ? C.fg : C.muted }} numberOfLines={1}>
                {t.label}
              </Text>
              {badge && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: '28%',
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: C.shard,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
