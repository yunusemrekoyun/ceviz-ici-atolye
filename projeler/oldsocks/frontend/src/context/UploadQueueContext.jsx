import { createContext, useState, useContext } from "react";

const UploadQueueContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useUploadQueue = () => useContext(UploadQueueContext);

export const UploadQueueProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);

  const addTask = (task) =>
    setQueue((queue) => {
      const next = { progress: 0, status: "pending", phase: "starting", ...task };
      return queue.some((item) => item.id === task.id)
        ? queue.map((item) => (item.id === task.id ? next : item))
        : [...queue, next];
    });
  const updateTask = (id, update) =>
    setQueue((q) => q.map((t) => (t.id === id ? { ...t, ...update } : t)));
  const removeTask = (id) => setQueue((q) => q.filter((t) => t.id !== id));

  return (
    <UploadQueueContext.Provider
      value={{ queue, addTask, updateTask, removeTask }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
};
