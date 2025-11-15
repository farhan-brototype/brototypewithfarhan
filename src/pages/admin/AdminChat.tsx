import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { format } from "date-fns";

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
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom);
      subscribeToMessages(selectedRoom);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
