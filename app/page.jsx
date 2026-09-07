"use client";
import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import DraftResumeBanner from "@/components/DraftResumeBanner";

const popupConfig = {
  header: "Recruitment Notice",
  description: "Welcome to the GDG Recruitment Portal.",
  message: [
    "Sign in with your student Google or email credentials to begin your application.",
    "You can select and apply to up to two technical departments.",
    "Draft responses are automatically saved in real-time as you type.",
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
