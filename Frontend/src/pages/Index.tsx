import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

const features = [
  { icon: FileText, title: 'Rich Notes', desc: 'Beautiful rich text editor with formatting' },
  { icon: Sparkles, title: 'AI Powered', desc: 'Summarize, check grammar, voice to text' },
  { icon: Shield, title: 'Secure', desc: 'Your notes are encrypted and private' },
  { icon: Zap, title: 'Fast', desc: 'Instant sync across all devices' },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Nav */}
      <nav className="flex items-center justify-between p-4 md:p-6 max-w-7xl mx-auto">
        <Logo />
        <div className="flex gap-3">
          <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
          <Button asChild><Link to="/register">Get Started</Link></Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6 animate-fade-in">
          <Sparkles className="h-4 w-4" />AI-Powered Notes
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Take smarter notes with <span className="gradient-text">AI Notes</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          The intelligent note-taking app that helps you capture, organize, and enhance your ideas with AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button size="xl" variant="premium" asChild>
            <Link to="/register" className="gap-2">Start for Free <ArrowRight className="h-5 w-5" /></Link>
          </Button>
          <Button size="xl" variant="outline" asChild><Link to="/login">Sign In</Link></Button>
        </div>

        {/* Development Test Links */}
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-3 font-medium">Development Testing</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/api-test">API Connection Test</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/integration-test">Frontend-Backend Integration Test</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/login-test">Login/Register Test</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/theme-test">Theme Test</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/editor-test">Editor Test</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-24 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {features.map((f) => (
            <div key={f.title} className="glass-card rounded-xl p-6 text-center hover-lift">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
