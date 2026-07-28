import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CHARACTERS, type CharacterId } from '../game/characters';
import { chooseCharacter } from '../game/engine';
import { store } from '../game/store';
import { Sprite } from './Sprite';
import { Button, Card } from './kit';
import { C, S } from './theme';

/**
 * Premier écran de l'aventure : qui descend dans la ville noyée.
 * Le choix ne touche à aucune statistique — il n'y a rien à optimiser ici, et
 * rien à regretter.
 */
export function CharacterSelect() {
  const [picked, setPicked] = useState<CharacterId>(CHARACTERS[0].id);
  const chosen = CHARACTERS.find((c) => c.id === picked) ?? CHARACTERS[0];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: C.fg, fontSize: 21, fontWeight: '700' }}>
          L'Alchimiste de Brume
        </Text>
        <Text style={[S.muted, S.small]}>
          La ville est sous l'eau et la brume monte. Quelqu'un doit redescendre y
          distiller ce qui reste. Qui ?
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {CHARACTERS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setPicked(c.id)}
            style={[
              S.card,
              {
                flexGrow: 1,
                flexBasis: '45%',
                alignItems: 'center',
                gap: 6,
                borderColor: picked === c.id ? C.essence : C.line,
              },
            ]}
          >
            <Sprite character={c.id} anim="idle" scale={1.15} />
            <Text style={[S.text, { fontWeight: '600' }]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={[S.text, { fontWeight: '700' }]}>{chosen.name}</Text>
        <Text style={[S.muted, S.small]}>{chosen.blurb}</Text>
        <Text style={[S.muted, S.small]}>
          Seule l'allure change : les dégâts, les points de vie et la vitesse sont
          identiques pour tous. Les quatre se battent au contact — ils traversent
          l'arène pour frapper, et vont chercher ce qui vole.
        </Text>
        <Button
          tone="primary"
          onPress={() => {
            store.act((s) => chooseCharacter(s, picked));
            // Écrit tout de suite : la sauvegarde périodique est à 5 s, et fermer
            // l'application avant renverrait le joueur sur ce même écran.
            store.save();
          }}
        >
          Descendre dans la brume
        </Button>
      </Card>
    </ScrollView>
  );
}
