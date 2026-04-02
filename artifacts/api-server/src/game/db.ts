import { pool } from "@workspace/db";
import { ServerGameState } from "./roomManager.js";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuffer = Buffer.from(hash, "hex");
    const derivedHash = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(hashBuffer, derivedHash);
  } catch {
    return false;
  }
}

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dev_users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("[DB] dev_users table ready");
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

export async function registerDevUser(
  username: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await pool.query("SELECT username FROM dev_users WHERE username = $1", [username]);
    if (existing.rows.length > 0) {
      return { success: false, error: "Bu kullanıcı adı zaten alınmış!" };
    }
    const hash = await hashPassword(password);
    await pool.query(
      "INSERT INTO dev_users (username, password_hash, display_name) VALUES ($1, $2, $3)",
      [username.toLowerCase(), hash, displayName?.trim() || null]
    );
    return { success: true };
  } catch (err) {
    console.error("[DB] registerDevUser error:", err);
    return { success: false, error: "Kayıt sırasında hata oluştu." };
  }
}

export async function loginDevUser(
  username: string,
  password: string
): Promise<{ success: boolean; displayName?: string; error?: string }> {
  try {
    const result = await pool.query<{ password_hash: string; display_name: string | null }>(
      "SELECT password_hash, display_name FROM dev_users WHERE username = $1",
      [username.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Kullanıcı adı veya şifre hatalı!" };
    }
    const row = result.rows[0];
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      return { success: false, error: "Kullanıcı adı veya şifre hatalı!" };
    }
    return { success: true, displayName: row.display_name ?? undefined };
  } catch (err) {
    console.error("[DB] loginDevUser error:", err);
    return { success: false, error: "Giriş sırasında hata oluştu." };
  }
}

export async function updateDevUserDisplayName(username: string, displayName: string): Promise<void> {
  await pool.query(
    "UPDATE dev_users SET display_name = $1 WHERE username = $2",
    [displayName.trim() || null, username.toLowerCase()]
  );
}
