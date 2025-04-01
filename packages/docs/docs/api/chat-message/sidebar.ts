import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/chat-message/chat-message-api",
    },
    {
      type: "category",
      label: "chatmessage",
      items: [
        {
          type: "doc",
          id: "api/chat-message/get-all-chat-messages",
          label: "List all chat messages",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/chat-message/remove-all-chat-messages",
          label: "Delete all chat messages",
          className: "api-method delete",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
