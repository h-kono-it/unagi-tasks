import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unagi Tasks</title>
      </head>
      <body class="bg-gray-950 text-white">
        <Component />
      </body>
    </html>
  );
});
