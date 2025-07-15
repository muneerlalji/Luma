
'use client';
import "./page.css"
import Image from "next/image";
import Page from "./components/page/Page";

export default function Home() {
    return (
    <Page>
      <main className="home-main">
        <section className="home-section">
          <Image
            src="/luma-hero.svg"
            alt="Friendly illustration"
            width={120}
            height={120}
            className="home-hero-img"
            priority
          />
          <h1 className="home-welcome-title">Welcome to Luma</h1>
          <p className="home-description">
            Luma is your gentle companion for memory support. Organize, remember, and thrive with a little help from your digital friend.
          </p>
        </section>
      </main>
    </Page>
  );
}
