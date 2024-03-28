import { TypingBubble } from '@/components';

export const LoadingBubble = () => (
  <div class="flex justify-start mb-2 items-start animate-fade-in host-container">
    <span class="px-4 py-4 ml-2 whitespace-pre-wrap max-w-full chatbot-host-bubble" data-testid="host-bubble">
      <TypingBubble />
    </span>
  </div>
);
