// Kinleo character manifest
// The shared definition of the character, used by every animation.
// DATA ONLY. Adding parts, colours or animations means editing this file and
// adding sprites. The engine in core/ never changes. See README.md.

window.KinleoCharacterManifest = {
  // Bump when saved characters need migrating (see migrate() in core/character.js).
  version: 1,

  // Every animation folder in animations/. Each holds animation.json and sprites/.
  animations: ['running'],

  // Size of one frame in pixels, the same for every animation.
  frame: { w: 32, h: 48 },

  // Rows in every sprite sheet, top to bottom. Drawn in this order (back to front).
  depths: ['far', 'mid', 'near', 'front'],

  // Within one depth, parts are drawn in this order (first = underneath).
  layerOrder: ['body', 'top', 'bottom', 'shoes', 'hair', 'accessory'],

  // Exact colours used in the sprites. They are swapped for the user's colours.
  // base = main tone, shade = darker tone (far side, ears, creases).
  // Never use these colours for anything else in the art.
  keyColors: {
    skin:      { base: '#FF0000', shade: '#800000' },
    hair:      { base: '#00FF00', shade: '#008000' },
    top:       { base: '#0000FF', shade: '#000080' },
    bottom:    { base: '#FFFF00', shade: '#808000' },
    shoes:     { base: '#00FFFF', shade: '#008080' },
    sole:      { base: '#FF00FF', shade: '#800080' },
    accessory: { base: '#FF8000', shade: '#804000' }
  },

  // How much darker the shade tone is than the colour the user picks (0 to 1).
  shadeAmount: 0.15,

  // Shape choices. Every variant needs a sheet in EVERY animation folder:
  // animations/<animation>/sprites/<part>/<variant>.png
  // optional: true means the user can pick "none".
  slots: {
    body:      { label: 'Body',      optional: false, default: 'standard', variants: { standard: 'Standard' } },
    hair:      { label: 'Hair',      optional: true,  default: 'short',    variants: { short: 'Short', buzz: 'Buzz' } },
    top:       { label: 'Top',       optional: false, default: 'singlet',  variants: { singlet: 'Singlet' } },
    bottom:    { label: 'Bottom',    optional: false, default: 'shorts',   variants: { shorts: 'Shorts' } },
    shoes:     { label: 'Shoes',     optional: false, default: 'trainers', variants: { trainers: 'Trainers' } },
    accessory: { label: 'Accessory', optional: true,  default: 'headband', variants: { headband: 'Headband' } }
  },

  // Colour choices. Keys must match keyColors. presets are the swatches shown to users.
  colors: {
    skin:      { label: 'Skin',      default: '#E8B98A', presets: ['#F6D3B3', '#E8B98A', '#C68B5E', '#8D5A3B', '#5C3A24'] },
    hair:      { label: 'Hair',      default: '#3A2A1E', presets: ['#1C1C1C', '#3A2A1E', '#7A4A24', '#C9A15A', '#B8452E'] },
    top:       { label: 'Top',       default: '#D2553F', presets: ['#D2553F', '#2F62C9', '#2E7D4F', '#C98A1B', '#1C1C1C'] },
    bottom:    { label: 'Bottom',    default: '#2B3A55', presets: ['#2B3A55', '#1C1C1C', '#6B6B6B', '#2E7D4F', '#7A4A24'] },
    shoes:     { label: 'Shoes',     default: '#1C1C1C', presets: ['#1C1C1C', '#FFFFFF', '#D2553F', '#2F62C9'] },
    sole:      { label: 'Sole',      default: '#FFFFFF', presets: ['#FFFFFF', '#1C1C1C', '#C98A1B'] },
    accessory: { label: 'Accessory', default: '#2F62C9', presets: ['#2F62C9', '#D2553F', '#2E7D4F', '#FFFFFF', '#1C1C1C'] }
  }
};
