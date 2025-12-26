/**
 * Test Login Page
 * 
 * Denna sida används endast för Playwright-tester.
 * Den loggar automatiskt in testanvändaren när sidan laddas.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const TestLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const login = async () => {
      console.log('[TestLogin] Starting login...');
      try {
        // Försök först med test-bot, sedan seed-bot som fallback
        let result = await supabase.auth.signInWithPassword({
          email: 'test-bot@local.test',
          password: 'TestPassw0rd!',
        });

        if (result.error) {
          console.log('[TestLogin] test-bot login failed, trying seed-bot...', result.error.message);
          result = await supabase.auth.signInWithPassword({
            email: 'seed-bot@local.test',
            password: 'Passw0rd!',
          });
        }

        if (result.error) {
          console.error('[TestLogin] Login failed:', result.error.message);
          return;
        }

        if (result.data.session) {
          console.log('[TestLogin] Login successful, session:', {
            hasAccessToken: !!result.data.session.access_token,
            userEmail: result.data.session.user?.email,
          });
          
          // Vänta längre för att säkerställa att sessionen är helt etablerad
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verifiera att sessionen faktiskt finns
          const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
          console.log('[TestLogin] Session verification:', {
            hasSession: !!verifySession,
            error: verifyError?.message,
          });
          
          if (!verifySession) {
            console.error('[TestLogin] Session not found after login');
            return;
          }
          
          // Navigera direkt till /files för att verifiera att sessionen fungerar
          console.log('[TestLogin] Navigating to /files');
          navigate('/files');
        } else {
          console.error('[TestLogin] No session in login response');
        }
      } catch (error) {
        console.error('[TestLogin] Login error:', error);
      }
    };

    login();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Loggar in testanvändare...</div>
    </div>
  );
};

export default TestLogin;

