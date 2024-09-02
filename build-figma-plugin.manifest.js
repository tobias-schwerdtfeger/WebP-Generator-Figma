// workaround for https://github.com/yuanqing/create-figma-plugin/issues/164

module.exports = function (manifest) {
  return {
    ...manifest,
    networkAccess: {
      allowedDomains: ["none"],
    },
    capabilities: ["inspect"],
  };
};
