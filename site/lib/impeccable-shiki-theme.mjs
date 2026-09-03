// Shiki theme mapped to DESIGN.md / site/styles/kinpaku-tokens.css.
// TextMate themes use sRGB hex; each value below is the browser sRGB result
// of the corresponding OKLCH token so design-system detection can match it.

// One theme: the paper system. Each value is the sRGB result of the token
// named beside it, so design-system detection can match it against DESIGN.md.
// Gold never appears here: it fails contrast as text on paper.
const paper = {
  bg: '#EEEEEE',          // paper-deep (code-block-bg)
  fg: '#1B1B1B',          // text
  strong: '#070707',      // ink
  muted: '#585858',       // text-muted
  faint: '#747474',       // text-faint
  patina: '#006660',      // patina-deep
  patinaInk: '#004F4A',   // patina-ink
  warning: '#B23B1D',     // vermilion
};

function theme(name, type, colors) {
  return {
    name,
    type,
    colors: {
      'editor.background': colors.bg,
      'editor.foreground': colors.fg,
    },
    tokenColors: [
      {
        scope: [
          'comment',
          'punctuation.definition.comment',
        ],
        settings: {
          foreground: colors.muted,
          fontStyle: 'italic',
        },
      },
      {
        scope: [
          'keyword',
          'storage',
          'storage.type',
          'support.type.property-name',
        ],
        settings: { foreground: colors.patina },
      },
      {
        scope: [
          'string',
          'constant.other.symbol',
          'markup.inline.raw.string',
        ],
        settings: { foreground: colors.patinaInk },
      },
      {
        scope: [
          'constant.numeric',
          'constant.language',
          'constant.character',
          'variable.language',
        ],
        settings: { foreground: colors.warning },
      },
      {
        scope: [
          'entity.name.function',
          'support.function',
          'variable.function',
        ],
        settings: { foreground: colors.strong },
      },
      {
        scope: [
          'entity.name.tag',
          'support.class.component',
          'entity.name.type',
          'entity.other.attribute-name',
        ],
        settings: { foreground: colors.patina },
      },
      {
        scope: [
          'variable',
          'meta.object-literal.key',
          'support.variable',
          'support.constant',
        ],
        settings: { foreground: colors.fg },
      },
      {
        scope: [
          'punctuation',
          'meta.brace',
          'meta.delimiter',
          'keyword.operator',
        ],
        settings: { foreground: colors.muted },
      },
      {
        scope: [
          'markup.heading',
          'markup.bold',
          'entity.name.section',
        ],
        settings: {
          foreground: colors.strong,
          fontStyle: 'bold',
        },
      },
      {
        scope: [
          'markup.italic',
          'markup.quote',
        ],
        settings: {
          foreground: colors.muted,
          fontStyle: 'italic',
        },
      },
    ],
  };
}

export const impeccableShikiThemes = {
  paper: theme('impeccable-paper', 'light', paper),
};

export const impeccableShikiTheme = impeccableShikiThemes.paper;
