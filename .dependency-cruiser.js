/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: ['@lordcraymen/adr-toolkit/presets/depcruise'],
  options: {
    doNotFollow: {
      path: 'node_modules'
    }
  }
};
