import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useRealtimeNotifications = (isAdmin: boolean) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to assignments
      const assignmentsChannel = supabase
        .channel('realtime-assignments')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'assignments',
          },
          (payload) => {
            const assignment = payload.new as any;
            
            // Users only see assignments assigned to them, admins see all
            if (!isAdmin && assignment.assigned_to !== user.id) return;

            // Play sound
            audioRef.current?.play().catch(() => {});

            // Show toast
            toast({
              title: "New Assignment",
              description: assignment.title,
              duration: 5000,
            });

            // Show desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Assignment', {
                body: assignment.title,
                icon: '/favicon.ico',
                tag: `assignment-${assignment.id}`,
              });
            }
          }
        )
        .subscribe();

      // Subscribe to emergencies (admins only see new ones)
      const emergenciesChannel = supabase
        .channel('realtime-emergencies')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'emergencies',
          },
          (payload) => {
            const emergency = payload.new as any;
            
            // Users see their own, admins see all
            if (!isAdmin && emergency.user_id !== user.id) return;

            // Play sound
            audioRef.current?.play().catch(() => {});

            // Show toast
            toast({
              title: "Emergency Alert",
              description: "A new emergency has been reported",
              variant: "destructive",
              duration: 5000,
            });

            // Show desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Emergency Alert', {
                body: 'A new emergency has been reported',
                icon: '/favicon.ico',
                tag: `emergency-${emergency.id}`,
                requireInteraction: true,
              });
            }
          }
        )
        .subscribe();

      // Subscribe to complaints (admins only)
      const complaintsChannel = supabase
        .channel('realtime-complaints')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'complaints',
          },
          (payload) => {
            const complaint = payload.new as any;
            
            // Users see their own, admins see all
            if (!isAdmin && complaint.user_id !== user.id) return;

            // Play sound
            audioRef.current?.play().catch(() => {});

            // Show toast
            toast({
              title: "New Complaint",
              description: complaint.title,
              duration: 5000,
            });

            // Show desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Complaint', {
                body: complaint.title,
                icon: '/favicon.ico',
                tag: `complaint-${complaint.id}`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(assignmentsChannel);
        supabase.removeChannel(emergenciesChannel);
        supabase.removeChannel(complaintsChannel);
      };
    };

    setupRealtimeSubscriptions();
  }, [isAdmin]);
};
