import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useTheme } from '@/context/ThemeContext';
import { Palette, Sun, Moon, Shield, ShieldOff } from 'lucide-react';

export default function ThemeTest() {
  const { colorTheme, mode, toggleMode, isThemeControlsEnabled } = useTheme();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Theme Test Page</h1>
            <p className="text-muted-foreground mt-2">
              Test light/dark mode and color theme switching
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={toggleMode}>
              {mode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <ThemeSwitcher />
          </div>
        </div>

        {/* Authentication & Theme Status */}
        <Card className={!isThemeControlsEnabled ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isThemeControlsEnabled ? (
                <Shield className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldOff className="h-5 w-5 text-amber-500" />
              )}
              Authentication & Theme Status
            </CardTitle>
            <CardDescription>
              Current authentication state and theme control availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Authentication Status</p>
                <p className={`text-lg font-bold ${isThemeControlsEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                  {isThemeControlsEnabled ? 'Authenticated' : 'Unauthenticated'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Theme Controls</p>
                <p className={`text-lg font-bold ${isThemeControlsEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                  {isThemeControlsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Current Route</p>
                <p className="text-lg font-mono text-muted-foreground">
                  {window.location.pathname}
                </p>
              </div>
            </div>
            {!isThemeControlsEnabled && (
              <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Theme controls are disabled for unauthenticated users. 
                  The theme is forced to light mode with default colors for login and public pages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Theme Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Current Theme
            </CardTitle>
            <CardDescription>
              Active theme configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Mode</p>
                <p className="text-2xl font-bold capitalize">{mode}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Color Theme</p>
                <p className="text-2xl font-bold capitalize">{colorTheme}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Samples */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary"></div>
                <span>Primary</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-secondary"></div>
                <span>Secondary</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-accent"></div>
                <span>Accent</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-destructive"></div>
                <span>Destructive</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-success"></div>
                <span>Success</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-warning"></div>
                <span>Warning</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Surface Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-background border"></div>
                <span>Background</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-card border"></div>
                <span>Card</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted"></div>
                <span>Muted</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Elements</CardTitle>
            <CardDescription>
              Test various UI components with current theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                This is muted background with muted foreground text.
              </p>
            </div>

            <div className="p-4 bg-accent rounded-lg">
              <p className="text-accent-foreground">
                This is accent background with accent foreground text.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gradient Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Gradients & Effects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ background: 'var(--gradient-primary)' }}
            >
              Primary Gradient
            </div>
            
            <div 
              className="h-20 rounded-lg flex items-center justify-center border"
              style={{ background: 'var(--gradient-card)' }}
            >
              Card Gradient
            </div>

            <div className="h-20 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center glow-effect">
              Glow Effect
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}