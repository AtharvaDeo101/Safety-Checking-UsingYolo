import Link from "next/link";

export function Nav() {
  return (
    <nav className="flex items-center space-x-6 p-4 bg-background">
      <Link href="/" className="text-lg font-bold text-primary">SafetyAI</Link>
      <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
      <Link href="/integration" className="text-muted-foreground hover:text-foreground">Integration</Link>
      <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
    </nav>
  );
}