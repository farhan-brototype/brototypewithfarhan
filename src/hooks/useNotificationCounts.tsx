import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationCounts {
  assignment: number;
  complaint: number;
  emergency: number;
  grade: number;
  [key: string]: number;
}

export const useNotificationCounts = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    assignment: 0,
    complaint: 0,
    emergency: 0,
    grade: 0,
    application: 0,
  });

  const loadCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("type, read")
      .eq("user_id", user.id)
      .eq("read", false);

    if (data) {
      const newCounts: NotificationCounts = {
        assignment: 0,
        complaint: 0,
        emergency: 0,
        grade: 0,
        application: 0,
      };

      data.forEach((notification) => {
        if (newCounts[notification.type] !== undefined) {
          newCounts[notification.type]++;
        }
      });

      setCounts(newCounts);
    }
  };

  const markAsRead = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("read", false);

    await loadCounts();
  };

  useEffect(() => {
    loadCounts();

    const channel = supabase
      .channel('notification-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { counts, markAsRead };
};
