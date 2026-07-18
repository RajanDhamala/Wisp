import { ChatPageContent } from "@/features/chat/ChatPageContent";
import { ChatClientStoreProvider } from "@/features/chat/state/chatClientStore";

const ChatPage = () => (
  <ChatClientStoreProvider>
    <ChatPageContent />
  </ChatClientStoreProvider>
);

export default ChatPage;
