import { registerWebComponents } from './register';
import { parseChatbot, injectChatbotInWindow } from './window';

registerWebComponents();

const chatbot = parseChatbot();

injectChatbotInWindow(chatbot);

export default chatbot;
