/*
 * The 3D Mesh. Change anything here and reload.
 * Base model: pixiv's CC0 VRoid sample (assets/models/mesh.vrm), recoloured in code.
 * Colours multiply the model's own textures (hair and eyes are greyscale, so the colour is exact).
 */
export default {
  model: '/assets/models/mesh.vrm',

  hairColour: '#1a1718',   // full black
  hairShade: '#0c0a0b',
  hairShine: '#22222a',    // soft dark highlight
  skin: '#b98262',         // brown
  skinShade: '#8a5a40',
  eyes: '#4a2e1f',         // dark brown
  brows: '#1c1414',
  shirt: '#2a2a2e',        // black top
  shirtShade: '#121214',
  hideTie: true,

  smile: 0.6,              // 0 = neutral, 1 = big smile (closed mouth)

  glasses: {
    on: true,
    frame: '#0d0b0a',      // bold black
    lens: '#8c9cff',       // blue-light tint
    lensOpacity: 0.12,
    // sizes in metres (the model is life-size): big, square, retro
    width: 0.064, height: 0.044, thickness: 0.0048, roundness: 0.006,
    gap: 0.072,            // centre-to-centre distance of the two frames
    armLength: 0.105,
    earX: 0.074, earY: 0.004, // where the arms meet the ears
    raise: -0.003,         // move up (+) / down (-)
    forward: 0.082,        // distance in front of the eyes
  },

  chain: {
    on: false, colour: '#d6a84c', cross: true,
    top: -0.045, drop: 0.075, width: 0.074, depth: 0.08, belly: 0.75, forward: 0.02,
    thickness: 0.0024, crossSize: 0.036,
  },

  // framing
  frameY: -0.05,           // camera aim relative to the head bone (metres)
  frameDistance: 1.16,

  // behaviour
  follow: 1.0,
  blink: true,
};
