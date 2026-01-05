import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/context/ThemeContext';

export function ThemeSwitcher() {
  const { colorTheme, mode, setColorTheme, setMode, toggleMode, colorThemes, isThemeControlsEnabled } = useTheme();

  // Don't render theme switcher if theme controls are disabled (unauthenticated users)
  if (!isThemeControlsEnabled) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-4">
          {/* Light/Dark Mode Toggle */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Appearance</p>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={mode === 'light' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('light')}
                className="flex-1 h-8"
              >
                <Sun className="h-3 w-3 mr-1" />
                Light
              </Button>
              <Button
                variant={mode === 'dark' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('dark')}
                className="flex-1 h-8"
              >
                <Moon className="h-3 w-3 mr-1" />
                Dark
              </Button>
            </div>
          </div>

          <Separator />

          {/* Color Theme Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Color Theme</p>
            <div className="grid grid-cols-1 gap-1">
              {colorThemes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => setColorTheme(themeOption.value)}
                  className={`flex items-center gap-3 p-2 rounded-md text-sm transition-colors hover:bg-accent ${
                    colorTheme === themeOption.value ? 'bg-accent' : ''
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: themeOption.color }}
                  />
                  <span className="flex-1 text-left">{themeOption.name}</span>
                  {colorTheme === themeOption.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className="w-full"
          >
            {mode === 'light' ? (
              <>
                <Moon className="h-3 w-3 mr-2" />
                Switch to Dark
              </>
            ) : (
              <>
                <Sun className="h-3 w-3 mr-2" />
                Switch to Light
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}