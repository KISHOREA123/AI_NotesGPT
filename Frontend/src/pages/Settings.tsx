import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Trash2, User, Info, Palette, Settings as SettingsIcon, Crown, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  const { user, logout } = useAuth();
  const { colorTheme, mode, setColorTheme, setMode, colorThemes } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
    logout();
    navigate('/login');
  };

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme as any);
    toast({ title: 'Theme updated', description: `Switched to ${colorThemes.find(t => t.value === newTheme)?.name} theme` });
  };

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? 'dark' : 'light');
    toast({ title: 'Appearance updated', description: `Switched to ${checked ? 'dark' : 'light'} mode` });
  };

  return (
    <div className="h-full">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Theme Settings */}
          <Card className="glass-card border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Theme</CardTitle>
              </div>
              <CardDescription>Customize the appearance of your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Color Theme</Label>
                <div className="grid grid-cols-1 gap-3">
                  {colorThemes.map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => handleThemeChange(themeOption.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02] ${
                        colorTheme === themeOption.value
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white/20 shadow-sm"
                        style={{ backgroundColor: themeOption.color }}
                      />
                      <span className="font-medium">{themeOption.name}</span>
                      {colorTheme === themeOption.value && (
                        <Badge variant="secondary" className="ml-auto">Active</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark appearance</p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch checked={mode === 'dark'} onCheckedChange={handleModeToggle} />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Settings */}
          <Card className="glass-card border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>Your personal information and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || 'user@example.com'}</p>
                  <Badge variant={user?.plan === 'pro' ? 'default' : 'secondary'} className="mt-1">
                    {user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={user?.name || ''} readOnly className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user?.email || ''} readOnly className="mt-1" />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'N/A'}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)} 
                  className="w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card className="glass-card border-border/50 shadow-lg md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Subscription</CardTitle>
              </div>
              <CardDescription>Manage your subscription plan and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Current Plan */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Current Plan</h3>
                    {user?.plan === 'pro' && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                  
                  <div className={`p-4 rounded-lg border-2 ${
                    user?.plan === 'pro' 
                      ? 'border-amber-500/50 bg-amber-500/10' 
                      : 'border-border bg-muted/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-lg">
                        {user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                      </h4>
                      <Badge variant={user?.plan === 'pro' ? 'default' : 'secondary'}>
                        {user?.plan === 'pro' ? 'Active' : 'Current'}
                      </Badge>
                    </div>
                    
                    <p className="text-2xl font-bold mb-3">
                      {user?.plan === 'pro' ? '$2.00' : '$0.00'}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Unlimited notes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Cloud sync</span>
                      </div>
                      {user?.plan === 'pro' ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>AI Summarizer (3 levels)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Grammar checking</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Voice-to-text</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Priority support</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
                            <span>AI Summarizer (Pro only)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
                            <span>Grammar checking (Pro only)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
                            <span>Voice-to-text (Pro only)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
                            <span>Priority support (Pro only)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {user?.plan === 'pro' && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Subscription active and managed through your account</p>
                    </div>
                  )}
                </div>

                {/* Plan Actions */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Plan Management</h3>
                  
                  {user?.plan === 'free' ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <h4 className="font-medium mb-2">Upgrade to Pro</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Unlock AI features (3-level summarization), grammar checking, voice-to-text, and priority support for just $2/month.
                        </p>
                        <Button onClick={() => navigate('/subscription')} className="w-full gap-2">
                          <Crown className="h-4 w-4" />
                          Upgrade Now
                        </Button>
                      </div>
                      
                      <Button variant="outline" className="w-full" onClick={() => navigate('/subscription')}>
                        View All Plans
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full" onClick={() => navigate('/subscription')}>
                        View Plans
                      </Button>
                      
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-sm text-muted-foreground text-center">
                          Subscription management will be available when billing is integrated.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Info */}
        <Card className="glass-card border-border/50 shadow-lg mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle>Application Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Version</p>
                <p className="font-mono">1.0.0</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Build</p>
                <p className="font-mono">2024.01.15</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Environment</p>
                <p className="font-mono">Production</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Region</p>
                <p className="font-mono">US-East</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Account
              </DialogTitle>
              <DialogDescription className="pt-2">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
