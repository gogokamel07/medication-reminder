"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const tabs = [
  { href: "/dashboard", label: "Today" },
  { href: "/medicines", label: "Medicines" },
  { href: "/history", label: "History" },
  { href: "/messages", label: "Messages" },
];

export default function Shell({ children, onReady }: { children: React.ReactNode; onReady?: (userId: string) => void }) {
  const router = useRouter();
  const path = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else { setOk(true); onReady?.(data.session.user.id); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ok) return <p className="muted center">Loading...</p>;
  return (
    <>
      <header>
        <strong>💊 Dawaa Reminder</strong>
        <button className="link" onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}>Log out</button>
      </header>
      <nav>
        {tabs.map(t => <Link key={t.href} href={t.href} className={path === t.href ? "active" : ""}>{t.label}</Link>)}
      </nav>
      <main>{children}</main>
      <footer className="muted">A helper only. It does not replace your doctor's instructions or an alarm.</footer>
    </>
  );
}
