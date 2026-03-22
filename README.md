# 🐀 Chef en Fuite AR

Une expérience de jeu en réalité augmentée construite avec THREE.js + WebXR.
Cachez des ingrédients dans le monde réel et défiez un ami de les retrouver,
avant que les chats de Skinner ne les volent !

🔗 [Tester en live](https://soukainanadir.github.io/ratatouille-in-paris-xr)

---

## Le principe

Inspiré de Ratatouille, **Chef en Fuite AR** est un jeu à 2 joueurs en tour par tour :

- **Le Cacheur** pointe son téléphone vers le sol, place jusqu'à 5 ingrédients 
  dans l'espace réel via le hit-test WebXR, puis passe le téléphone.
- **Le Rat** a 60 secondes pour retrouver et collecter tous les ingrédients 
  en tapant dessus, tout en évitant un chat AR qui rôde et vole les ingrédients.

Les ingrédients tombent avec gravité physique au moment du placement, rebondissent 
sur le sol réel, puis flottent et brillent pour indiquer leur présence.

---

## Mode d'emploi

1. Ouvrir le lien live sur un appareil compatible WebXR (Android + Chrome recommandé,  
   iOS via WebXR Viewer ou HelloXR)
2. Choisir son rôle : **Je cache** ou **Je cherche**
3. Appuyer sur **Start AR** et pointer la caméra vers une surface plate
4. *(Mode Cacheur)* Quand le réticule apparaît, taper pour poser un ingrédient -  
   il tombe du ciel et rebondit sur le sol. Répéter jusqu'à 5 ingrédients, puis **Terminé**
5. Passer le téléphone au Rat
6. *(Mode Rat)* Retrouver les ingrédients en 60 secondes en tapant dessus - 
   ils n'apparaissent que quand on s'en approche à moins de 1.5m
7. Attention au chat qui arrive et vole les ingrédients non collectés !

---

## Démo

![Demo](demo.gif)

---

## Fonctionnalités

| Fonctionnalité | Détails |
|---|---|
| **Hit-test WebXR** | Le réticule se snap sur les surfaces réelles via l'API WebXR hit-test |
| **Interaction tactile** | Tap pour placer, tap pour collecter |
| **Physique (Cannon-es)** | Les ingrédients tombent avec gravité et rebondissent sur le sol AR |
| **Ombres sur sol réel** | `ShadowMaterial` transparent ancré au niveau du hit-test |
| **Éclairage adaptatif** | `XREstimatedLight` ajuste l'éclairage à la lumière réelle de la pièce |
| **Regard (gaze)** | Réticule de visée centré sur la caméra |
| **Audio procédural** | Sons générés avec la Web Audio API (oscillateurs, enveloppes ADSR) - aucun fichier audio chargé |
| **Chat AR** | Ennemi autonome qui se déplace vers les ingrédients et les vole |
| **UI DOM overlay** | Interface adaptée mobile, intégrée à la session AR |

---

## Lancer en local
```bash
git clone https://github.com/SoukainaNadir/ratatouille-in-paris-xr.git
cd ratatouille-in-paris-xr
npm install
npm run dev
```

HTTPS requis pour WebXR — utiliser Cloudflare Tunnel :
```bash
npm run cloud
```

---

## Sources & crédits

- Template de base — [fdoganis/three_vite_xr_ts](https://github.com/fdoganis/three_vite_xr_ts) (MIT)
- Référence WebXR hit-test — [threejs.org/examples/webxr_ar_cones](https://threejs.org/examples/webxr_ar_cones.html) (MIT)
- Éclairage estimé — [threejs.org/examples/webxr_ar_lighting](https://threejs.org/examples/webxr_ar_lighting.html) (MIT)
- Workflow de déploiement — [meta-quest/webxr-first-steps](https://github.com/meta-quest/webxr-first-steps) (MIT)
- Physique — [Cannon-es](https://github.com/pmndrs/cannon-es) (MIT)
- Audio procédural — [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (MDN)

---

## Licence

MIT — voir [LICENSE](./LICENSE)