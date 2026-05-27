/**
 * Stylelint config — catches `var(--name)` references to custom properties
 * that aren't defined anywhere. The themes package is the source of truth
 * for color/spacing/radius vars; local `base.css` adds a few non-themed
 * vars (text-on-primary, image scrims).
 *
 * Adding this gate caught a real bug: the original riftbound-editor.css
 * referenced `--color-accent` and `--color-bg-input` (neither defined),
 * silently falling back to `#2563eb` blue and `#ffffff` white — broken
 * in every theme other than vanilla light.
 */
module.exports = {
  plugins: ['stylelint-value-no-unknown-custom-properties'],
  rules: {
    'csstools/value-no-unknown-custom-properties': [
      true,
      {
        importFrom: [
          require.resolve('@wolffm/themes/style.css'),
          require.resolve('./src/styles/base.css')
        ]
      }
    ]
  }
}
