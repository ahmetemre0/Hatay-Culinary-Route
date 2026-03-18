import { useGameStore } from "./store/gameStore";
import { SetupPage } from "./pages/SetupPage";
import { GamePage } from "./pages/GamePage";
import { GameOverPage } from "./pages/GameOverPage";

function App() {
  const phase = useGameStore((s) => s.phase);

  if (phase === "setup") return <SetupPage />;
  if (phase === "game_over") return <GameOverPage />;
  return <GamePage />;
}

export default App;
