import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export const useUserProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data as UserProfile;
    },
    enabled: !!userId,
  });
};

// Helper function to get user initials
export const getUserInitials = (profile: UserProfile | null): string => {
  if (!profile) return '?';
  
  if (profile.full_name) {
    const names = profile.full_name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return profile.full_name.substring(0, 2).toUpperCase();
  }
  
  if (profile.email) {
    return profile.email.substring(0, 2).toUpperCase();
  }
  
  return '?';
};
