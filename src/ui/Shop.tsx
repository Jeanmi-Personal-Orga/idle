import { ScrollView, Text, View } from 'react-native';
import { formatNum, grantKeys, keysLeft, pushLog } from '../game/engine';
import { GOLD_PACKS, KEY_PACKS } from '../game/shop';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';
import { Button, Card, Label, Muted, Row } from './kit';
import { S } from './theme';

/**
 * Le comptoir, à deux étages :
 *
 * - les **sacs d'or**, qui paient le temps des longs chantiers depuis l'écran
 *   concerné ;
 * - les **clés de mission**, qui ouvrent des tentatives.
 *
 * Les deux s'achètent en argent réel. Ni l'un ni l'autre ne vend de ressource :
 * une clé n'est qu'un droit d'entrée, il faut encore remporter la mission.
 *
 * ⚠ **Mode test** : toucher un prix crédite immédiatement, sans paiement. C'est là
 * uniquement pour équilibrer et essayer le jeu. Avant toute mise en ligne, ces
 * boutons doivent passer par la facturation App Store et Google Play **avec
 * vérification du reçu côté serveur** — sinon n'importe qui se crédite ce qu'il
 * veut.
 */
export function ShopView() {
  const state = useGame();

  return (
    <ScrollView contentContainerStyle={S.view}>
      <Card>
        <Label>Sacs d'or</Label>
        <Muted>Le seul achat en argent réel du jeu. Tout le reste se gagne en jouant.</Muted>
        {GOLD_PACKS.map((pack) => (
          <Row between key={pack.id}>
            <Row>
              <ResIcon id="goldCoin" size={14} />
              <Text style={S.bold}>{formatNum(pack.gold)}</Text>
              {pack.bonus > 0 && <Muted>dont {formatNum(pack.bonus)} offerts</Muted>}
            </Row>
            <Button
              tone="primary"
              onPress={() =>
                store.act((st) => {
                  st.resources.goldCoin += pack.gold;
                  pushLog(st, `Comptoir (test) : +${formatNum(pack.gold)} sacs d'or.`);
                })
              }
            >
              {pack.price}
            </Button>
          </Row>
        ))}
        <Muted>
          Mode test : les prix créditent l'or sans passer par un paiement. Avant la mise
          en ligne, il faudra la facturation des magasins et une vérification des reçus
          côté serveur.
        </Muted>
      </Card>

      <Card>
        <Row between>
          <Label>Clés de mission</Label>
          <Muted>🔑 {keysLeft(state)} en poche</Muted>
        </Row>
        <Muted>
          Une clé ouvre une tentative de mission — et une mission déjà remportée se
          rejoue pour sa récompense. On n'achète pas les ressources : on achète le droit
          d'aller les chercher. Les clés achetées ne se périment pas : la remise à zéro
          de minuit ne touche que les trois clés du jour.
        </Muted>
        {KEY_PACKS.map((pack) => (
          <Row between key={pack.id}>
            <Row>
              <Text style={S.bold}>🔑 {pack.keys}</Text>
              {pack.keys > 1 && <Muted>lot</Muted>}
            </Row>
            <Button tone="primary" onPress={() => store.act((st) => grantKeys(st, pack.keys))}>
              {pack.price}
            </Button>
          </Row>
        ))}
        <Muted>Mode test également : les clés sont créditées sans paiement.</Muted>
      </Card>
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}
