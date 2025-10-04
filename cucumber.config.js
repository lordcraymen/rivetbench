export default {
  default: {
    import: ['test/steps/*.ts'],
    format: ['progress'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true
  }
};
