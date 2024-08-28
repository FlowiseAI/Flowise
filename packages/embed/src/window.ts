import { observersConfigType } from './components/Bot';

/* eslint-disable solid/reactivity */
type BotProps = {
  chatflowid: string;
  apiHost?: string;
  chatflowConfig?: Record<string, unknown>;
  observersConfig?: observersConfigType;
};

let fullElementUsed: Element | undefined;
let chatbotElementUsed: Element | undefined;

export const initFull = (props: BotProps & { id?: string }) => {
  destroyFull();
  const fullElement = props.id ? document.getElementById(props.id) : document.querySelector('aai-fullchatbot');
  if (!fullElement) throw new Error('<aai-fullchatbot> element not found.');
  Object.assign(fullElement, props);
  fullElementUsed = fullElement;
};

export const init = (props: BotProps) => {
  destroyChatbot();
  const element = document.createElement('aai-chatbot');
  Object.assign(element, props);
  document.body.appendChild(element);
  chatbotElementUsed = element;
};

export const destroyFull = () => {
  fullElementUsed?.remove();
  fullElementUsed = undefined;
};

export const destroyChatbot = () => {
  chatbotElementUsed?.remove();
  chatbotElementUsed = undefined;
};

export const destroy = () => {
  destroyFull();
  destroyChatbot();
};

type Chatbot = {
  initFull: typeof initFull;
  init: typeof init;
  destroy: typeof destroy;
};

declare const window:
  | {
      Chatbot: Chatbot | undefined;
    }
  | undefined;

export const parseChatbot = () => ({
  initFull,
  init,
  destroy,
});

export const injectChatbotInWindow = (bot: Chatbot) => {
  if (typeof window === 'undefined') return;
  window.Chatbot = { ...bot };
};
