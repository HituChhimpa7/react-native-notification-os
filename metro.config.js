const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
  projectRoot: path.resolve(__dirname, 'example'),
  watchFolders: [__dirname],
  resolver: {
    extraNodeModules: {
      'react-native-notification-os': path.resolve(__dirname, 'src'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
