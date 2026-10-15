// src/components/auth/Auth.jsx
import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";

const Auth = ({ redirectTo }) => {
  const [mode, setMode] = useState("login");

  return (
    <div className="max-w-md mx-auto px-6 py-10 bg-white shadow rounded-xl relative overflow-hidden">
        {mode === "login" && (
          <Login
            key="login"
            redirectTo={redirectTo}
            onSwitch={() => setMode("register")}
            onForgotPassword={() => setMode("forgot")}
          />
        )}
        {mode === "register" && (
          <Register key="register" onSwitch={() => setMode("login")} />
        )}
        {mode === "forgot" && (
          <ForgotPassword
            key="forgot"
            onBackToLogin={() => setMode("login")}
          />
        )}
    </div>
  );
};

export default Auth;
