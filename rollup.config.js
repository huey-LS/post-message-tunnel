
import babel from 'rollup-plugin-babel';

export default {
  name: 'PostMessageTunnel',
  input: 'src/index.js',
  output: {
    name: 'PostMessageTunnel',
    file: 'dist/post-message-tunnel.js',
    format: 'umd'
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    })
  ]
};
