
import { useParams } from 'react-router';
import { ChatMessage } from '../chatmessage/ChatMessage';

export default function ChatflowPreview() {
  const params = useParams();

  return (
      <div>
          <ChatMessage isDialog={true} open={true} chatflowid={params.chatflowid} />
      </div>
  )
}
