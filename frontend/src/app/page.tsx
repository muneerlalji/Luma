
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
            Luma is your gentle companion for memory support. We use your photos and the people you tag in them to help you remember cherished events and loved ones, while encouraging you to stay connected.
          </p>
        </section>
        <section className="home-section" style={{ marginTop: '2rem' }}>
          <h2 className="home-welcome-title" style={{ fontSize: '1.25rem' }}>How Luma Helps</h2>
          <ul style={{ color: '#3730a3', fontSize: '1rem', lineHeight: 1.7, paddingLeft: 0, listStyle: 'none', margin: 0 }}>
            <li style={{ marginBottom: '1rem' }}><strong>Photo Memories:</strong> Luma organizes your photos and tags to help you recall special moments and the people who matter most.</li>
            <li style={{ marginBottom: '1rem' }}><strong>People Reminders:</strong> Get gentle reminders to reach out to friends and family you haven’t connected with in a while.</li>
            <li style={{ marginBottom: '1rem' }}><strong>Event Recall:</strong> Easily revisit past events, birthdays, and anniversaries with context from your photo history.</li>
            <li style={{ marginBottom: '1rem' }}><strong>Relationship Insights:</strong> See how often you interact with loved ones and get suggestions to nurture those relationships.</li>
            <li style={{ marginBottom: '1rem' }}><strong>Personalized Suggestions:</strong> Luma learns your preferences to offer thoughtful prompts and reminders tailored to you.</li>
          </ul>
        </section>
        <section className="home-section" style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.85)' }}>
          <h2 className="home-welcome-title" style={{ fontSize: '1.25rem' }}>Why Luma?</h2>
          <p className="home-description">
            Our mission is to help you stay connected, remember the moments that matter, and support your well-being through gentle, smart reminders. Luma is private, secure, and designed with empathy.
          </p>
        </section>
        <section className="home-section" style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.85)' }}>
          <h2 className="home-welcome-title" style={{ fontSize: '1.25rem' }}>Get Started</h2>
          <p className="home-description">
            Sign up today and let Luma help you cherish your memories and relationships.
          </p>
        </section>
      </main>
    </Page>
  );
}
