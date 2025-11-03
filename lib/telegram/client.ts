// Telegram Bot API client for sending notifications

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN is not set - Telegram notifications will be disabled');
}

if (!TELEGRAM_CHAT_ID) {
  console.warn('⚠️  TELEGRAM_CHAT_ID is not set - Telegram notifications will be disabled');
}

export const telegramConfig = {
  botToken: TELEGRAM_BOT_TOKEN,
  chatId: TELEGRAM_CHAT_ID,
  enabled: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
};

interface SendMessageOptions {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

/**
 * Send a message to Telegram chat via Bot API
 */
export async function sendTelegramMessage(options: SendMessageOptions): Promise<boolean> {
  if (!telegramConfig.enabled) {
    console.log('Telegram notifications disabled - skipping message send');
    return false;
  }

  const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramConfig.chatId,
        text: options.text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('✅ Telegram message sent successfully:', data.result.message_id);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error);
    return false;
  }
}

