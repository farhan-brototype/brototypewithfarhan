import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
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

const AdminChat = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      const channel = subscribeToMessages(selectedRoom);
      return () => {
        supabase.removeChannel(channel);
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
    }
    
    await loadRooms();
  };

  const loadRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at");

    if (data) {
      setRooms(data);
      if (data.length > 0) {
        setSelectedRoom(data[0].id);
      }
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
      .channel(`admin_chat_room_${roomId}`)
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
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    const { error } = await supabase.from("chat_messages").insert({
      room_id: selectedRoom,
      sender_id: userId,
      message: newMessage,
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === "admin_all_users") return "Admin & All Users";
    if (room.type === "user_admin") {
      return room.name.replace("admin_", "Chat with User: ");
    }
    return room.name;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Chat</h1>

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
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="flex gap-2 mt-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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

export default AdminChat;
    if (user) {
      setCurrentUserId(user.id);
    }

    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }

    setRooms(data || []);
    if (data && data.length > 0) {
      setSelectedRoom(data[0].id);
    }
  };

  const fetchMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Fetch profiles separately
    if (data) {
      const userIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const messagesWithProfiles = data.map(msg => ({
        ...msg,
        profiles: profiles?.find(p => p.id === msg.sender_id) || { full_name: null, email: "" }
      }));

      setMessages(messagesWithProfiles);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (newMsg) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", newMsg.sender_id)
              .single();

            setMessages((prev) => [...prev, {
              ...newMsg,
              profiles: profile || { full_name: null, email: "" }
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: selectedRoom,
          sender_id: currentUserId,
          message: newMessage
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Chat</h1>

      <Card>
        <CardHeader>
          <CardTitle>Messaging</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedRoom} onValueChange={setSelectedRoom}>
            <TabsList className="grid w-full grid-cols-3">
              {rooms.map((room) => (
                <TabsTrigger key={room.id} value={room.id}>
                  {room.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {rooms.map((room) => (
              <TabsContent key={room.id} value={room.id}>
                <div className="space-y-4">
                  <ScrollArea className="h-[400px] border rounded-lg p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.sender_id === currentUserId ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender_id === currentUserId
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-xs font-semibold mb-1">
                              {msg.profiles?.full_name || "Unknown"}
                            </p>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {format(new Date(msg.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                    />
                    <Button type="submit">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChat;
