import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '@/services/database';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { DatabaseUser, mapDatabaseUserToUser } from '@/types';

class GoogleAuthService {
  private configured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const clientId = config.GOOGLE_CLIENT_ID;
      const clientSecret = config.GOOGLE_CLIENT_SECRET;
      const callbackURL = config.GOOGLE_CALLBACK_URL;

      if (!clientId || !clientSecret || !callbackURL) {
        logger.warn('Google OAuth not configured - missing credentials');
        return;
      }

      passport.use(
        new GoogleStrategy(
          {
            clientID: clientId,
            clientSecret: clientSecret,
            callbackURL: callbackURL,
          },
          async (_accessToken, _refreshToken, profile, done) => {
            try {
              const result = await this.handleGoogleAuth(profile);
              return done(null, result);
            } catch (error) {
              logger.error('Google OAuth error:', error);
              return done(error, false);
            }
          }
        )
      );

      this.configured = true;
      logger.info('Google OAuth service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google OAuth:', error);
      this.configured = false;
    }
  }

  private async handleGoogleAuth(profile: any): Promise<any> {
    const supabase = db.getClient();
    
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName || profile.name?.givenName || 'Google User';
    const googleId = profile.id;
    const avatarUrl = profile.photos?.[0]?.value || null;

    if (!email) {
      throw new Error('No email provided by Google');
    }

    try {
      // Check if user exists by email
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingUser) {
        // User exists, update Google ID if not set
        const dbUser = existingUser as DatabaseUser;
        if (!dbUser.google_id) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              google_id: googleId,
              email_verified: true,
              last_login_at: new Date().toISOString(),
            } as Partial<DatabaseUser>)
            .eq('id', dbUser.id)
            .select()
            .single();

          if (updateError) {
            logger.error('Failed to update user with Google ID:', updateError);
          }
        } else {
          // Just update last login
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() } as Partial<DatabaseUser>)
            .eq('id', dbUser.id)
            .select()
            .single();
        }

        return mapDatabaseUserToUser(dbUser);
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: email.toLowerCase(),
            name: name,
            google_id: googleId,
            email_verified: true,
            plan: 'free',
            avatar_url: avatarUrl,
            last_login_at: new Date().toISOString(),
          } as Partial<DatabaseUser>)
          .select()
          .single();

        if (createError || !newUser) {
          throw new Error('Failed to create user account');
        }

        logger.info(`New user created via Google OAuth: ${email}`);
        return mapDatabaseUserToUser(newUser as DatabaseUser);
      }
    } catch (error) {
      logger.error('Google auth database error:', error);
      throw new Error('Failed to process Google authentication');
    }
  }

  isGoogleAuthConfigured(): boolean {
    return this.configured;
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();