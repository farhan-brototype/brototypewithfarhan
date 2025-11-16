import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, MessageSquare, Check, CheckCheck } from "lucide-react";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  read_by: string[] | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  type: string;
}

const Chat = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const presenceChannel = useRef<any>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      markMessagesAsRead(selectedRoom);
      const channel = subscribeToMessages(selectedRoom);
      setupPresence(selectedRoom);
      return () => {
        supabase.removeChannel(channel);
        if (presenceChannel.current) {
          supabase.removeChannel(presenceChannel.current);
        }
      };
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await loadUserRooms(user.id);
    }
  };

  const loadUserRooms = async (currentUserId: string) => {
    const { data: allRooms } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at");

    if (!allRooms) return;

    // Get user's profile to match their admin room
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", currentUserId)
      .single();

    // For regular users: show "Admin All Users", "All Users", and their private admin room
    const userRooms = allRooms.filter(room => {
      if (room.type === "admin_all_users" || room.type === "all_users") {
        return true;
      }
      if (room.type === "user_admin") {
        // Match by name (Admin - Full Name or Admin - Email)
        const matchName = userProfile?.full_name && room.name.includes(userProfile.full_name);
        const matchEmail = room.name.includes(userProfile?.email || "");
        return matchName || matchEmail;
      }
      return false;
    });

    setRooms(userRooms);
    if (userRooms.length > 0) {
      setSelectedRoom(userRooms[0].id);
    }
  };

  const loadMessages = async (roomId: string) => {
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at");

    if (!messagesData) return;

    const profileIds = [...new Set(messagesData.map(m => m.sender_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    const messagesWithProfiles = messagesData.map(msg => ({
      ...msg,
      profiles: profilesMap.get(msg.sender_id) || { full_name: "Unknown", email: "" }
    }));

    setMessages(messagesWithProfiles);
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`chat_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", newMsg.sender_id)
            .maybeSingle();

          setMessages(prev => [...prev, {
            ...newMsg,
            profiles: profile || { full_name: "Unknown", email: "" }
          }]);
          
          // Auto-mark as read when new message arrives
          if (newMsg.sender_id !== userId) {
            markMessageAsRead(newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev =>
            prev.map(msg => msg.id === updatedMsg.id ? { ...msg, read_by: updatedMsg.read_by } : msg)
          );
        }
      )
      .subscribe();

    return channel;
  };

  const setupPresence = (roomId: string) => {
    presenceChannel.current = supabase
      .channel(`presence_${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.current.presenceState();
        const typingUserIds = Object.keys(state)
          .filter(key => state[key][0]?.typing && state[key][0]?.user_id !== userId)
          .map(key => state[key][0]?.user_id);
        setTypingUsers(typingUserIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.current.track({
            user_id: userId,
            typing: false,
          });
        }
      });
  };

  const handleTyping = async (value: string) => {
    setNewMessage(value);
    
    if (presenceChannel.current && value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        await presenceChannel.current.track({
          user_id: userId,
          typing: true,
        });
      }
    } else if (presenceChannel.current && !value.trim() && isTyping) {
      setIsTyping(false);
      await presenceChannel.current.track({
        user_id: userId,
        typing: false,
      });
    }
  };

  const markMessagesAsRead = async (roomId: string) => {
    const { data: unreadMessages } = await supabase
      .from("chat_messages")
      .select("id, read_by")
      .eq("room_id", roomId)
      .neq("sender_id", userId);

    if (!unreadMessages) return;

    for (const msg of unreadMessages) {
      const readBy = msg.read_by || [];
      if (!readBy.includes(userId)) {
        await supabase
          .from("chat_messages")
          .update({ read_by: [...readBy, userId] })
          .eq("id", msg.id);
      }
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    const { data: msg } = await supabase
      .from("chat_messages")
      .select("read_by")
      .eq("id", messageId)
      .single();

    if (msg) {
      const readBy = msg.read_by || [];
      if (!readBy.includes(userId)) {
        await supabase
          .from("chat_messages")
          .update({ read_by: [...readBy, userId] })
          .eq("id", messageId);
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    const { error } = await supabase.from("chat_messages").insert({
      room_id: selectedRoom,
      sender_id: userId,
      message: newMessage,
      read_by: [userId],
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
    
    if (presenceChannel.current && isTyping) {
      setIsTyping(false);
      await presenceChannel.current.track({
        user_id: userId,
        typing: false,
      });
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === "admin_all_users") return "Announcements (Admin)";
    if (room.type === "all_users") return "All Users";
    if (room.type === "user_admin") {
      // Room name is already formatted nicely
      return room.name;
    }
    return room.name;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Chat</h1>

      <div className="grid gap-4">
        {/* Room Selection Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Select Chat Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  variant={selectedRoom === room.id ? "default" : "outline"}
                  onClick={() => setSelectedRoom(room.id)}
                  className="flex-1 min-w-[200px]"
                >
                  {getRoomDisplayName(room)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Messages Area */}
        {selectedRoom && (
          <Card>
            <CardHeader>
              <CardTitle>
                {getRoomDisplayName(rooms.find(r => r.id === selectedRoom)!)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm font-semibold mb-1">
                          {msg.profiles.full_name || msg.profiles.email}
                        </p>
                        <p>{msg.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                          {msg.sender_id === userId && msg.read_by && msg.read_by.length > 1 && (
                            <p className="text-xs opacity-70">✓✓ Read</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm italic opacity-70">Someone is typing...</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="flex gap-2 mt-4">
                <Input
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Chat;
