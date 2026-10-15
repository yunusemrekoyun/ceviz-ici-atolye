"use client";
import React, { useState } from "react";

const defaultFormState = {
  name: { value: "", error: "" },
  email: { value: "", error: "" },
  message: { value: "", error: "" },
};

export const Contact = () => {
  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {
      name: formData.name.value,
      email: formData.email.value,
      message: formData.message.value,
    };

    try {
      const res = await fetch("https://formspree.io/f/xkgbrvqa", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMessage("Message sent successfully!");
        setFormData(defaultFormState);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } catch (err) {
      setErrorMessage("An error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseStyles =
    "px-3 py-2 w-full rounded-md text-sm transition outline-none";
  const lightMode =
    "bg-neutral-100 text-neutral-800 placeholder-neutral-500 focus:ring-2 focus:ring-neutral-300";
  const darkMode =
    "dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-400 dark:focus:ring-2 dark:focus:ring-neutral-500";

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="flex flex-col md:flex-row justify-between gap-5">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          required
          className={`${inputBaseStyles} ${lightMode} ${darkMode}`}
          value={formData.name.value}
          onChange={(e) =>
            setFormData({
              ...formData,
              name: { value: e.target.value, error: "" },
            })
          }
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          required
          className={`${inputBaseStyles} ${lightMode} ${darkMode}`}
          value={formData.email.value}
          onChange={(e) =>
            setFormData({
              ...formData,
              email: { value: e.target.value, error: "" },
            })
          }
        />
      </div>

      <textarea
        name="message"
        placeholder="Your Message"
        rows={10}
        required
        className={`${inputBaseStyles} ${lightMode} ${darkMode} mt-4 resize-none`}
        value={formData.message.value}
        onChange={(e) =>
          setFormData({
            ...formData,
            message: { value: e.target.value, error: "" },
          })
        }
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-4 bg-sky-600 text-white font-semibold py-2 rounded-md hover:bg-sky-700 transition disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Submit"}
      </button>

      {successMessage && (
        <p className="mt-4 text-green-600 font-medium">{successMessage}</p>
      )}
      {errorMessage && (
        <p className="mt-4 text-red-600 font-medium">{errorMessage}</p>
      )}
    </form>
  );
};
