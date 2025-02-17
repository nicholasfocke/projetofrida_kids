import { Html, Head, Main, NextScript } from 'next/document';
import { Analytics } from "@vercel/analytics/react"

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />

        {/* SEO e Meta Tags */}
        <meta name="description" content="Frida Kids - Agendamentos para cortes e penteados infantis." />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
