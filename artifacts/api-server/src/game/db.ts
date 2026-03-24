import { pool } from "@workspace/db";
import { ServerGameState } from "./roomManager.js";

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_rooms (
      room_code TEXT PRIMARY KEY,
      host_socket_id TEXT NOT NULL,
      state JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("[DB] game_rooms table ready");
}

export async function saveRoom(code: string, hostSocketId: string, state: ServerGameState): Promise<void> {
  await pool.query(
    `INSERT INTO game_rooms (room_code, host_socket_id, state, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (room_code) DO UPDATE SET
       host_socket_id = EXCLUDED.host_socket_id,
       state = EXCLUDED.state,
       updated_at = NOW()`,
    [code, hostSocketId, JSON.stringify(state)]
  );
}

export async function loadRoom(code: string): Promise<{ host_socket_id: string; state: ServerGameState } | null> {
  const result = await pool.query<{ host_socket_id: string; state: ServerGameState }>(
    "SELECT host_socket_id, state FROM game_rooms WHERE room_code = $1",
    [code]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function deleteRoom(code: string): Promise<void> {
  await pool.query("DELETE FROM game_rooms WHERE room_code = $1", [code]);
  console.log(`[DB] Room ${code} deleted`);
}
