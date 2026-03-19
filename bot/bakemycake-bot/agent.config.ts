import { z, defineConfig } from '@botpress/runtime';

export default defineConfig({
    name: 'Agent-Cake-Assistant',
    description:
        'Customer ordering assistant for BakeMyCake (Lugano, Switzerland). ' +
        'Helps customers browse the cake catalog, get delivery estimates, and pay via Stripe. ' +
        'Responds in Italian (default), English, and Russian.',

    defaultModels: {
        autonomous: 'openai:gpt-4o-mini',
        zai: 'openai:gpt-4o-mini',
    },

    bot: {
        state: z.object({}),
    },

    user: {
        // Track the detected language so the bot stays consistent across messages
        state: z.object({
            detectedLocale: z.enum(['it', 'en', 'ru']).default('it').optional(),
        }),
    },

    dependencies: { "integrations": { "chat": { "version": "chat@0.7.6", "enabled": true }, "webchat": { "version": "webchat@0.3.0", "enabled": true } } },
});
