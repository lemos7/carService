module.exports = {
  content: ['./src/**/*.{html,ts}', './node_modules/flowbite/**/*.js'],
  theme: {
    extend: {
      colors: { brand: '#e7ac51', surface: '#a0a0a0', danger: '#fe0000', success: '#187900' },
    },
  },
  plugins: [require('flowbite/plugin')],
};
