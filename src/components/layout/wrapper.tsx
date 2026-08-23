import { ReactNode } from "react";
import { Logo } from "./logo";
import { Status } from "./status";


export function Wrapper(children: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-cbg text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,rgba(79,227,193,0.07),transparent_40%),radial-gradient(circle_at_85%_100%,rgba(255,138,92,0.06),transparent_40%)]">
        <div className="w-full max-w-2xl mx-auto px-5 py-5">
            <header className="flex justify-between items-center">
                <Logo />
                <Status />
            </header>
        </div>
      </div>
    </main>
  );
}
