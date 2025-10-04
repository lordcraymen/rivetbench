export default {
  default: {
    requireModule: ['tsx'],
    require: ['test/steps/**/*.ts'],
    format: ['progress', 'html:test-results/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    paths: ['test/features/**/*.feature'],
    publishQuiet: true
  }
};
