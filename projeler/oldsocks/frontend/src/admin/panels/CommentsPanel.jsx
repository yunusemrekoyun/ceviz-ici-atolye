// src/pages/admin/CommentsPanel.jsx
import React, { useState } from "react";
import {
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
} from "@material-tailwind/react";
import CommentsList from "./CommentsList";
import CommentRepliesPage from "./CommentRepliesPage";

export default function CommentsPanel() {
  const [tab, setTab] = useState("comments");

  return (
    <div>
      <h4 className="text-2xl mb-4">Yorum Yönetimi</h4>
      <Tabs value={tab} onChange={(value) => setTab(value)}>
        <TabsHeader>
          <Tab value="comments">Yorumlar</Tab>
          <Tab value="replies">Yanıtlar</Tab>
        </TabsHeader>
        <TabsBody>
          <TabPanel value="comments">
            <CommentsList />
          </TabPanel>
          <TabPanel value="replies">
            <CommentRepliesPage />
          </TabPanel>
        </TabsBody>
      </Tabs>
    </div>
  );
}
