/*
 * The 3D Mesh. Change anything here and reload: the head is rebuilt from
 * these values (no 3D files involved).
 *
 * Colours are any CSS hex. Sizes are roughly 0..1.5, where 1 = as built.
 */
export default {
  skin: '#a86f4c',        // medium brown
  hairColour: '#141010',  // black, a touch warm
  hairShine: '#6b5a52',   // the soft sheen on the hair
  brows: '#141010',
  eyes: '#3a2416',        // dark brown iris
  lips: '#7d4538',

  faceWidth: 0.93,        // < 1 = slimmer face
  jaw: 0.24,              // how much the chin narrows
  ears: 1,

  hairVolume: 1.0,        // overall thickness / height of the hair
  fringe: 1.0,            // how far the front falls over the forehead
  messiness: 1.0,         // 0 = combed, 1.5 = just woke up
  hairLength: 1.0,        // sides and back
  seed: 11,               // change for a different (same-style) hair arrangement

  glasses: {
    on: true,
    frame: '#0d0d0f',
    lens: '#8c9cff',      // the blue-light coating tint
    lensOpacity: 0.16,
    width: 0.5, height: 0.34, roundness: 0.07, thickness: 0.055,
  },

  smile: 0.55,            // 0 = neutral, 1 = big smile
  stubble: 0.12,         // faint moustache shadow, 0 = off
  shirt: '#1d1d1f',       // black tee
  chain: { on: true, colour: '#d6a84c' },

  // Behaviour
  follow: 1.0,            // how much the head turns to the cursor
  blink: true,
  greeting: 'ආයුබෝවන්!', // said when someone clicks the head
};
