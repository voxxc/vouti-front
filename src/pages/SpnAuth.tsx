import { useState } from 'react';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LogoSpn from '@/components/Spn/LogoSpn';
import classroomImg from '@/assets/spn-classroom.jpg';

const SpnAuth = () => {
  const { signIn, signUp } = useSpnAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signUp(email, password, fullName);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Mobile: Full-screen background image */}
      <div className="lg:hidden fixed inset-0 z-0">
        <img
          src={classroomImg}
          alt="English classroom with teacher"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-emerald-900/75" />
      </div>

      {/* Desktop: Left photo panel */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <img
          src={classroomImg}
          alt="English classroom with teacher"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/70 to-emerald-700/40 flex flex-col items-start justify-start p-12 pt-16">
          <LogoSpn size="lg" />
          <p className="mt-4 text-white/90 text-lg text-left max-w-md leading-relaxed">
            A plataforma moderna para aprender inglês.<br />
            Interativa, gamificada e eficaz.
          </p>
        </div>
      </div>

      {/* Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        {/* Mobile branding */}
        <div className="lg:hidden mb-6 flex flex-col items-center">
          <LogoSpn size="md" />
          <p className="mt-2 text-white/80 text-sm text-center max-w-xs leading-relaxed">
            A plataforma moderna para aprender inglês.
          </p>
        </div>

        <Card className="w-full max-w-md border-0 shadow-none lg:bg-transparent bg-white/10 backdrop-blur-xl lg:backdrop-blur-none">
          <CardContent className="p-6 lg:p-0">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 lg:bg-muted bg-white/20">
                <TabsTrigger value="signin" className="lg:text-foreground text-white data-[state=active]:text-foreground">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="lg:text-foreground text-white data-[state=active]:text-foreground">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="lg:text-foreground text-white">Email</Label>
                    <Input id="email" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      placeholder="your@email.com" className="lg:bg-background bg-white/20 lg:text-foreground text-white placeholder:text-white/50 lg:placeholder:text-muted-foreground lg:border-input border-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="lg:text-foreground text-white">Password</Label>
                    <Input id="password" type="password" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      placeholder="••••••••" className="lg:bg-background bg-white/20 lg:text-foreground text-white placeholder:text-white/50 lg:placeholder:text-muted-foreground lg:border-input border-white/30" />
                  </div>
                  {error && <p className="text-sm text-red-300 lg:text-destructive">{error}</p>}
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="lg:text-foreground text-white">Full Name</Label>
                    <Input id="fullName" value={fullName}
                      onChange={e => setFullName(e.target.value)} required
                      placeholder="John Doe" className="lg:bg-background bg-white/20 lg:text-foreground text-white placeholder:text-white/50 lg:placeholder:text-muted-foreground lg:border-input border-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail" className="lg:text-foreground text-white">Email</Label>
                    <Input id="signupEmail" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      placeholder="your@email.com" className="lg:bg-background bg-white/20 lg:text-foreground text-white placeholder:text-white/50 lg:placeholder:text-muted-foreground lg:border-input border-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword" className="lg:text-foreground text-white">Password</Label>
                    <Input id="signupPassword" type="password" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      placeholder="Min 6 characters" className="lg:bg-background bg-white/20 lg:text-foreground text-white placeholder:text-white/50 lg:placeholder:text-muted-foreground lg:border-input border-white/30" />
                  </div>
                  {error && <p className="text-sm text-red-300 lg:text-destructive">{error}</p>}
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpnAuth;
