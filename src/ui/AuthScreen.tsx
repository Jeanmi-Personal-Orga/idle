import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CHARACTERS, type CharacterId } from '../game/characters';
import { authStore, skipAuth } from '../game/auth';
import { chooseCharacter } from '../game/engine';
import { store } from '../game/store';
import { Sprite } from './Sprite';
import { Button, Card, Muted } from './kit';
import { C, S } from './theme';

/**
 * Écran de connexion/inscription. On peut toujours l'ignorer — c'est un jeu solo,
 * imposer un compte serait hostile. Il réapparaît via « Se connecter » dans
 * l'en-tête, pour qui a sauté l'étape et change d'avis.
 */
export function AuthScreen({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Choisi à l'inscription : un nouveau compte n'a pas à enchaîner deux écrans
  // pour savoir qui il incarne.
  const [picked, setPicked] = useState<CharacterId>(CHARACTERS[0].id);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await authStore.login(email, password);
      } else {
        await authStore.register(username, email, password);
        // Le personnage choisi ici est appliqué tout de suite, et écrit sans
        // attendre la sauvegarde périodique.
        store.act((st) => chooseCharacter(st, picked));
        store.save();
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Text style={{ color: C.fg, fontSize: 21, fontWeight: '700' }}>L'Alchimiste de Brume</Text>
        <Muted>
          Connecte-toi pour retrouver ta partie sur n'importe quel appareil, ou continue
          sans compte — tout reste jouable sur l'appareil.
        </Muted>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['login', 'register'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                S.button,
                { flex: 1 },
                mode === m ? { borderColor: C.essence } : S.buttonGhost,
              ]}
            >
              <Text style={[S.buttonText, mode === m && { color: C.essence }]}>
                {m === 'login' ? 'Connexion' : 'Créer un compte'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'register' && (
          <>
            <Field
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={setUsername}
              autoComplete="username"
            />
            <Muted>Qui descend dans la brume ?</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                      padding: 8,
                      gap: 4,
                      borderColor: picked === c.id ? C.essence : C.line,
                    },
                  ]}
                >
                  <Sprite character={c.id} anim="idle" scale={0.8} />
                  <Text style={[S.text, S.small, { fontWeight: '600' }]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
            <Muted>{CHARACTERS.find((c) => c.id === picked)?.blurb}</Muted>
          </>
        )}

        <Field
          placeholder="Email"
          value={email}
          onChange={setEmail}
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          placeholder="Mot de passe"
          value={password}
          onChange={setPassword}
          secure
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {error && <Muted>{error}</Muted>}
        <Button tone="primary" disabled={busy} onPress={submit}>
          {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </Button>
      </Card>

      <Button
        tone="ghost"
        onPress={() => {
          skipAuth();
          onDone();
        }}
      >
        Jouer sans compte
      </Button>
    </ScrollView>
  );
}

/** Champ de saisie, au style du reste de l'interface. */
function Field({
  placeholder,
  value,
  onChange,
  secure,
  keyboardType,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'username' | 'email' | 'current-password' | 'new-password';
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      value={value}
      onChangeText={onChange}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoComplete={autoComplete}
      autoCapitalize="none"
      style={{
        backgroundColor: '#151b24',
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: C.fg,
        fontSize: 15,
      }}
    />
  );
}
