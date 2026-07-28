/**
 * Point d'entrée natif. Expo enregistre le composant racine ; il n'y a plus de
 * `index.html` ni de montage DOM depuis le passage à React Native.
 */
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
