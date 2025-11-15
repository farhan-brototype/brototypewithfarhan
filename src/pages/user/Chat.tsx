import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  profiles: {
    full_name: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  type: string;
}

const Chat = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadRooms();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      loadMessages(selectedRoomId);
      subscribeToMessages(selectedRoomId);
    }
  }, [selectedRoomId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at");

    if (data) {
      setRooms(data);
      if (data.length > 0) setSelectedRoomId(data[0].id);
    }
  };

  const loadMessages = async (roomId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select(`
        *,
        profiles:sender_id (full_name)
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as any);
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
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("chat_messages")
            .select(`
              *,
              profiles:sender_id (full_name)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as any]);
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
    if (!newMessage.trim() || !selectedRoomId) return;

    const { error } = await supabase.from("chat_messages").insert({
      room_id: selectedRoomId,
      sender_id: currentUserId,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Chat</h1>

      <Tabs value={selectedRoomId} onValueChange={setSelectedRoomId}>
        <TabsList>
          {rooms.map((room) => (
            <TabsTrigger key={room.id} value={room.id}>
              {room.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {rooms.map((room) => (
          <TabsContent key={room.id} value={room.id}>
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_id === currentUserId
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <div className="text-xs opacity-70 mb-1">
                            {msg.profiles?.full_name || "Unknown User"}
                          </div>
                          <div>{msg.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), "p")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Chat;
