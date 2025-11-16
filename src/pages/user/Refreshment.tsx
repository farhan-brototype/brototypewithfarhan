import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const games = [
  { name: "Sudoku", url: "https://sudoku.com/" },
];

const Refreshment = () => {
  const [secondsUsed, setSecondsUsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const MAX_SECONDS = 30 * 60; // 30 minutes in seconds

  useEffect(() => {
    loadUsage();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  const loadUsage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("refreshment_usage")
      .select("minutes_used")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    setSecondsUsed((data?.minutes_used || 0) * 60);
  };

  const startGame = async (gameUrl: string) => {
    const remainingSeconds = MAX_SECONDS - secondsUsed;
    if (remainingSeconds <= 0) {
      toast.error("Sorry, you have used this feature to its full limit today!");
      return;
    }

    setSelectedGame(gameUrl);
    setTimeLeft(remainingSeconds);
    setIsPlaying(true);
  };

  const stopGame = async () => {
    if (!isPlaying) return;

    const actualSecondsUsed = (MAX_SECONDS - secondsUsed) - timeLeft;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const totalSecondsUsed = secondsUsed + actualSecondsUsed;
    const minutesToStore = Math.ceil(totalSecondsUsed / 60);
    
    const { error } = await supabase.from("refreshment_usage").upsert({
      user_id: user.id,
      date: today,
      minutes_used: minutesToStore,
    }, {
      onConflict: "user_id,date"
    });

    if (!error) {
      setSecondsUsed(totalSecondsUsed);
    }

    setIsPlaying(false);
    setSelectedGame(null);
    setTimeLeft(0);
    
    const displayMinutes = Math.floor(actualSecondsUsed / 60);
    const displaySeconds = actualSecondsUsed % 60;
    toast.success(`Game session ended. ${displayMinutes}m ${displaySeconds}s used.`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (secondsUsed >= MAX_SECONDS) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Refreshment Zone</h1>
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold mb-2">Daily Limit Reached</p>
            <p className="text-muted-foreground">
              Sorry, you have used this feature to its full limit today (30 minutes).
              Come back tomorrow for more gaming time!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPlaying && selectedGame) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Playing Game</h1>
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold">
              Time Remaining: {formatTime(timeLeft)}
            </div>
            <Button variant="destructive" onClick={stopGame}>
              Stop Game
            </Button>
          </div>
        </div>
        <Card className="h-[calc(100vh-200px)]">
          <CardContent className="p-0 h-full">
            <iframe
              src={selectedGame}
              className="w-full h-full border-0"
              title="Game"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Refreshment Zone</h1>
        <div className="text-lg font-semibold">
          Time Used Today: {Math.floor(secondsUsed / 60)}m {secondsUsed % 60}s / 30 minutes
        </div>
      </div>

      <Card className="bg-accent/50">
        <CardHeader>
          <CardTitle>Daily Gaming Allowance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You have {Math.floor((MAX_SECONDS - secondsUsed) / 60)} minutes and {(MAX_SECONDS - secondsUsed) % 60} seconds of gaming time remaining today.
            Choose a game below to start playing!
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card key={game.name} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{game.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => startGame(game.url)}>
                Play Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Refreshment;
