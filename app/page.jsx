"use client";
import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import DraftResumeBanner from "@/components/DraftResumeBanner";

const popupConfig = {
  header: "GDG on Campus · VIT Chennai",
  description: "Welcome to Technical Recruitment 2026 for student developers.",
  message: [
    "Sign in with your student Google or email account to start your recruitment journey.",
    "Choose up to 2 technical departments that match your interests or what you want to learn.",
    "Beginners are warmly welcomed — we value curiosity, reasoning, and problem solving over prior perfection.",
    "Your application progress is automatically saved to your device in real-time as you type.",
  ],
};

const Home = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavBar />
      <DraftResumeBanner />

      {/* Notice Popup only opens on-demand when user clicks the notice button */}
      <PopupComp
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        PopupData={popupConfig}
      />

      <main className="flex-1 flex flex-col justify-center">
        <Hero onOpenNotice={() => setIsDialogOpen(true)} />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
