"use client"
import dynamic from "next/dynamic";

// Dynamically import the Game component (disable SSR for canvas rendering).
const Game = dynamic(() => import("./components/Game"), { ssr: false });

export default function HomePage() {
  return <Game />;
}
