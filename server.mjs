import { createReviewServer } from './app.mjs';

const host = process.env.AUTHDIFF_HOST || '127.0.0.1';
const port = Number(process.env.AUTHDIFF_PORT || 4782);

createReviewServer().listen(port, host, () => {
  console.log('AuthDiff workbench listening on http://' + host + ':' + port);
});
