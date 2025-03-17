import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/chatflows/chatflows-api",
    },
    {
      type: "category",
      label: "chatflows",
      items: [
        {
          type: "doc",
          id: "api/chatflows/create-chatflow",
          label: "Create a new chatflow",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/chatflows/list-chatflows",
          label: "List all chatflows",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/chatflows/get-chatflow-by-id",
          label: "Get chatflow by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/chatflows/update-chatflow",
          label: "Update chatflow details",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/chatflows/delete-chatflow",
          label: "Delete a chatflow",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/chatflows/get-chatflow-by-api-key",
          label: "Get chatflow by API key",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
