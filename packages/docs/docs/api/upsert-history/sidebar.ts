import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/upsert-history/upsert-history-api",
    },
    {
      type: "category",
      label: "upsert-history",
      items: [
        {
          type: "doc",
          id: "api/upsert-history/get-all-upsert-history",
          label: "Get all upsert history records",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/upsert-history/patch-delete-upsert-history",
          label: "Delete upsert history records",
          className: "api-method patch",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
