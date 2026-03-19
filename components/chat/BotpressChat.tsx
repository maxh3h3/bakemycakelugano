'use client';

import Script from 'next/script';

interface BotpressChatProps {
  locale: string;
}

const BOT_ID = 'a2b14439-a1bd-42a7-aca0-15fd22841a59';
const CLIENT_ID = '88efad03-5af0-4591-b58f-0d12655e1e77';

export default function BotpressChat({ locale }: BotpressChatProps) {
  const placeholder =
    locale === 'en' ? 'How can I help you?' :
    locale === 'ru' ? 'Чем могу помочь?' :
    'Come posso aiutarti?';

  function handleLoad() {
    (window as any).botpress?.init({
      botId: BOT_ID,
      clientId: CLIENT_ID,
      botName: 'BakeMyCake',
      composerPlaceholder: placeholder,
      configuration: {
        themeColor: '#b5855a',
        showPoweredBy: false,
      },
    });
  }

  return (
    <Script
      src="https://cdn.botpress.cloud/webchat/v2.2/inject.js"
      strategy="afterInteractive"
      onLoad={handleLoad}
    />
  );
}
