/********************************************************
 * frontend/src/config/isAdmin.js
 ********************************************************/
export const isAdmin = () => {
  return localStorage.getItem("isAdmin") === "true";
};
