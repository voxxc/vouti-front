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
    <div className="min-h-screen flex bg-background">
      {/* Left: Classroom Photo */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <img
          src={classroomImg}
          alt="English classroom with teacher"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/70 to-emerald-700/40 flex flex-col items-center justify-center p-12">
          <LogoSpn size="lg" />
          <p className="mt-6 text-white/90 text-lg text-center max-w-md leading-relaxed">
            The modern platform for learning English.<br />
            Interactive, gamified, and effective.
          </p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="lg:hidden mb-8 flex justify-center">
              <LogoSpn size="md" />
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      placeholder="your@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      placeholder="••••••••" />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName}
                      onChange={e => setFullName(e.target.value)} required
                      placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input id="signupEmail" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      placeholder="your@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <Input id="signupPassword" type="password" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      placeholder="Min 6 characters" />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
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
