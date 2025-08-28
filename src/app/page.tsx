"use client";

import { DriveToday } from "@/components/landing/DriveToday";
import { Features } from "@/components/landing/Features";
import { FirstBlock } from "@/components/landing/FirstBlock";
import { OurFleet } from "@/components/landing/OurFleet";
import SliderBrands from "@/components/landing/SliderBrands/SliderBrands";

export default function Home() {
  return (
    <div>
      {/* <Navbar /> */}
      <FirstBlock />
      <SliderBrands />
      <Features />
      <OurFleet />
      <DriveToday />
    </div>
  );
}